import os
import re
import tempfile
import subprocess
from pathlib import Path
from typing import List, Optional

import fitz  # PyMuPDF
import numpy as np

from fastapi import (
    FastAPI, UploadFile, File, Form, Query, Body, Depends, HTTPException,
    Request
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from sqlmodel import SQLModel, select, func, case
from pydantic import BaseModel

from models import Page
from database import init_db, get_session
from embedding import get_embedding
from faiss_index import PageIndex
from pdf_preview import render_page_preview
from vision import run_vision_model
from llm_helpers import clean_text_and_generate_tags
from auth import verify_session, load_allowed_emails


# Ensure the preview directory exists BEFORE mounting as static
os.makedirs("uploads/previews", exist_ok=True)

# Optional: basic admin key for safety
ADMIN_KEY = os.environ.get("ADMIN_KEY", "devkey")

def check_admin(key: str = Query(...)):
    if key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Not authorized.")

def vision_context_prompt(tags, extracted_text, extra_context=None):
    prompt = ""
    if tags:
        prompt += f"Tags: {tags}\n"
    if extra_context:
        prompt += extra_context + "\n"
    if extracted_text:
        prompt += 'Extracted text from the page:\n"""\n' + extracted_text.strip() + '\n"""\n'
    prompt += "Please summarize or describe the worksheet page for an elementary school teacher."
    return prompt

app = FastAPI(dependencies=[Depends(verify_session)])

# Serve PNG previews at /previews/*
app.mount("/previews", StaticFiles(directory="uploads/previews"), name="previews")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

init_db()
if os.environ.get("NODE_ENV") == "production":
    load_allowed_emails()
index = PageIndex()

# Rebuild FAISS index from existing DB entries
session = get_session()

# Wipe out any previous index and mapping
index.clear()

pages = session.exec(select(Page)).all()
for page in pages:
    if page.embedding:
        embedding = np.array(list(map(float, page.embedding.split(",")))).tolist()
        index.add(page, embedding)

class TagUpdate(BaseModel):
    tags: str

class ExportRequest(BaseModel):
    page_ids: List[int]
    order: List[int]
    title: Optional[str] = None

class SimpleExportRequest(BaseModel):
    page_ids: List[int]

class FilesRequest(BaseModel):
    file_names: List[str]

@app.post("/upload")
@app.post("/upload_pdf/")
async def upload_pdf(
    file: UploadFile = File(...),
    vision_on_upload: str = Form("false")
):
    try:
        os.makedirs("uploads", exist_ok=True)
        filename = os.path.basename(file.filename)
        original_path = file.filename
        file_location = f"uploads/{filename}"
        with open(file_location, "wb") as f_out:
            content = await file.read()
            f_out.write(content)

        try:
            doc = fitz.open(file_location)
        except Exception as e:
            print(f"PyMuPDF failed to open {filename}: {e}")
            raise HTTPException(status_code=400, detail=f"PDF parsing failed: {e}")

        session = get_session()
        num_pages = doc.page_count
        pages_processed = 0
        preview_urls = []
        preview_texts = []

        for i in range(num_pages):
            page_obj = doc[i]
            raw_text = page_obj.get_text()
            text = clean_pdf_text(raw_text)
            images = page_obj.get_images(full=True)
            is_image_heavy = len(images) > 0

            # --- AI Cleaning & Tag Generation ---
            try:
                cleaned_text, ai_tags = clean_text_and_generate_tags(text)
            except Exception as e:
                print(f"AI cleaning/tagging failed for {filename}, page {i+1}: {e}")
                cleaned_text, ai_tags = text, []

            # --- Folder tags ---
            folder_tags = []
            if original_path and ("/" in original_path or "\\" in original_path):
                folders = os.path.dirname(original_path).replace("\\", "/").split("/")
                folder_tags = [f for f in folders if f]

            tags = list(set(ai_tags + folder_tags))
            if is_image_heavy:
                tags.append("image_heavy")

            # --- Embedding Logic ---
            embed_text = cleaned_text
            if tags:
                embed_text = embed_text.strip() + "\n[tags: " + ", ".join(tags) + "]"
            if embed_text and len(embed_text.strip()) > 10:
                try:
                    embedding = get_embedding(embed_text)
                except Exception as e:
                    print(f"Embedding failed for {filename}, page {i+1}: {e}")
                    embedding = None
            else:
                embedding = None

            page = Page(
                pdf_name=filename,
                pdf_path=original_path,
                page_number=i + 1,
                text=cleaned_text,  # <--- Save cleaned text!
                embedding=",".join(map(str, embedding)) if embedding else None,
                tags=",".join(tags) if tags else None,
            )
            session.add(page)
            pages_processed += 1

            # Generate preview image
            try:
                from pdf_preview import render_page_preview
                render_page_preview(file_location, i + 1)
                preview_url = f"http://localhost:8000/previews/{filename}-page{i+1}.png"
                preview_urls.append(preview_url)
            except Exception as e:
                print(f"Failed to generate preview for page {i+1}: {e}")
                preview_urls.append(None)

            preview_texts.append(cleaned_text)

        session.commit()
        print(f"Successfully processed {pages_processed}/{num_pages} pages in {filename}")

        # --- Vision on upload (for image_heavy pages only) ---
        if vision_on_upload and vision_on_upload.lower() == "true":
            print(f"Vision processing all image_heavy pages for {filename}...")
            for i in range(num_pages):
                page = session.exec(
                    select(Page).where((Page.pdf_name == filename) & (Page.page_number == i + 1))
                ).first()
                if not page or not page.tags or "image_heavy" not in page.tags:
                    continue
                if getattr(page, "vision_summary", None):
                    continue  # already processed
                preview_path = f"uploads/previews/{filename}-page{i+1}.png"
                if os.path.exists(preview_path):
                    prompt = vision_context_prompt(page.tags, page.text, extra_context="Elementary worksheet page.")
                    try:
                        vision_output = run_vision_model(preview_path, prompt)
                        page.vision_summary = vision_output
                        session.add(page)
                        session.commit()
                        print(f"Vision processed page {i+1} in {filename}")
                    except Exception as e:
                        print(f"Vision failed for {filename} page {i+1}: {e}")

        # --- Update FAISS index for all pages in DB ---
        global index
        index.clear()
        all_pages = session.exec(select(Page)).all()
        for page in all_pages:
            if page.embedding:
                embedding = list(map(float, page.embedding.split(",")))
                index.add(page, embedding)

        return {
            "filename": filename,
            "page_count": num_pages,
            "previews": preview_urls,
            "pages": preview_texts
        }

    except Exception as e:
        print(f"Error in upload_pdf for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed for {file.filename}: {e}")


class TagUpdate(BaseModel):
    tags: str

@app.patch("/pages/{page_id}/tags")
def update_tags(page_id: int, update: TagUpdate):
    session = get_session()
    page = session.get(Page, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    # Clean and normalize tags
    tag_list = [t.strip().lower() for t in (update.tags or "").split(",") if t.strip()]
    page.tags = ",".join(tag_list)
    # --- RECOMPUTE EMBEDDING WITH NEW TAGS ---
    embed_text = page.text or ""
    if tag_list:
        embed_text = embed_text.strip() + "\n[tags: " + ", ".join(tag_list) + "]"
    if embed_text and len(embed_text.strip()) > 10:
        try:
            embedding = get_embedding(embed_text)
            page.embedding = ",".join(map(str, embedding)) if embedding else None
        except Exception as e:
            print(f"Embedding update failed for page {page_id}: {e}")
            page.embedding = None
    else:
        page.embedding = None

    session.add(page)
    session.commit()

    # --- UPDATE FAISS IN-MEMORY INDEX ---
    try:
        global index
        idx_to_update = None
        for idx, (pid, _) in enumerate(index.page_map):
            if pid == page_id:
                idx_to_update = idx
                break
        if idx_to_update is not None:
            index.index.remove_ids(np.array([idx_to_update], dtype=np.int64))
            index.page_map.pop(idx_to_update)
        if page.embedding:
            new_embedding = list(map(float, page.embedding.split(",")))
            index.add(page, new_embedding)
        print(f"FAISS index updated for page {page_id}")
    except Exception as e:
        print(f"FAISS index update failed for page {page_id}: {e}")

    return {"status": "ok"}

@app.get("/tags")
def list_all_tags():
    session = get_session()
    pages = session.exec(select(Page)).all()
    tag_set = set()
    for p in pages:
        if p.tags:
            tags = [t.strip().lower() for t in p.tags.split(",") if t.strip()]
            tag_set.update(tags)
    # Sort alphabetically, case-insensitive (capital letters first)
    return sorted(tag_set, key=lambda s: s.lower())

@app.get("/search")
def search_pages(q: str = Query(...), tag: Optional[str] = None):
    session = get_session()

    query_context = q
    if "grade" not in q.lower():
        query_context += " for early elementary education"

    query_embedding = get_embedding(query_context)
    seeds = index.search(query_embedding, top_k=10)

    visited = set()
    scored_results = []

    # Direct FAISS results with score 1.0
    for r in seeds:
        page = session.exec(select(Page).where(Page.id == r["page_id"])).first()
        if page and page.id not in visited:
            if tag and tag.lower() not in (page.tags or "").lower():
                continue
            scored_results.append({
                "page_id": page.id,
                "text": page.text,
                "pdf_name": page.pdf_name,
                "page_number": page.page_number,
                "tags": page.tags or "",
                "score": 1.0
            })
            visited.add(page.id)

    # Graph-style expansion: 1-hop neighbors via shared tags, score = 0.6
    for r in seeds:
        base_page = session.exec(select(Page).where(Page.id == r["page_id"])).first()
        if not base_page or not base_page.tags:
            continue
        tagset = set([t.strip().lower() for t in (base_page.tags or "").split(",")])

        candidates = session.exec(select(Page)).all()
        for p in candidates:
            if p.id in visited or p.id == base_page.id:
                continue
            if not p.embedding:
                continue
            if tag and tag.lower() not in (p.tags or "").lower():
                continue

            p_tags = set([t.strip().lower() for t in (p.tags or "").split(",")])
            overlap = tagset & p_tags
            if overlap:
                scored_results.append({
                    "page_id": p.id,
                    "text": p.text,
                    "pdf_name": p.pdf_name,
                    "page_number": p.page_number,
                    "tags": p.tags or "",
                    "score": 0.6
                })
                visited.add(p.id)

    sorted_results = sorted(scored_results, key=lambda x: x["score"], reverse=True)
    return sorted_results

@app.get("/files")
def list_uploaded_files():
    session = get_session()
    result = session.exec(select(Page)).all()
    file_info = {}

    for page in result:
        key = page.pdf_name
        if key not in file_info:
            file_info[key] = {
                "pdf_name": key,
                "page_count": 0,
                "image_heavy_count": 0
            }
        file_info[key]["page_count"] += 1
        if "image-heavy" in (page.tags or ""):
            file_info[key]["image_heavy_count"] += 1

    return list(file_info.values())

@app.get("/pages/{page_id}")
def get_page(page_id: int):
    session = get_session()
    page = session.get(Page, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@app.get("/pages_by_pdf")
def get_pages_by_pdf(pdf_name: str):
    session = get_session()
    pages = session.exec(select(Page).where(Page.pdf_name == pdf_name)).all()
    return [
        {
            "page_id": p.id,
            "text": p.text,
            "page_number": p.page_number,
            "tags": p.tags or "",
            "vision_summary": p.vision_summary
        }
        for p in pages
    ]

@app.post("/pages/by-files")
def get_pages_by_files(payload: FilesRequest):
    session = get_session()
    if not payload.file_names:
        return []
    pages = session.exec(
        select(Page)
        .where(Page.pdf_name.in_(payload.file_names))
        .order_by(Page.pdf_name, Page.page_number)
    ).all()
    return [
        {
            "page_id": p.id,
            "pdf_name": p.pdf_name,
            "page_number": p.page_number,
            "text": p.text,
            "tags": p.tags or "",
            "vision_summary": p.vision_summary,
        }
        for p in pages
    ]

@app.get("/pages/filter")
def filter_pages(query: str = Query(...)):
    session = get_session()
    q = query.lower().replace(":", "")
    pages = session.exec(
        select(Page).where(func.lower(func.replace(Page.text, ":", "")).like(f"%{q}%"))
    ).all()
    return [
        {
            "page_id": p.id,
            "pdf_name": p.pdf_name,
            "page_number": p.page_number,
            "text": p.text,
            "tags": p.tags or "",
        }
        for p in pages
    ]


@app.post("/export_pages")
def export_selected_pages(payload: ExportRequest):
    session = get_session()
    ordered_ids = payload.order or payload.page_ids
    pages = [session.get(Page, pid) for pid in ordered_ids if pid is not None]

    pdf_writer = fitz.open()

    # Optional title page
    if payload.title:
        title_doc = fitz.open()
        title_page = title_doc.new_page()
        title_page.insert_text((72, 150), payload.title, fontsize=24, fontname="helv")
        pdf_writer.insert_pdf(title_doc)

    for page in pages:
        if page:
            src_path = UPLOAD_DIR / page.pdf_name
            src_doc = fitz.open(src_path)
            pdf_writer.insert_pdf(src_doc, from_page=page.page_number - 1, to_page=page.page_number - 1)

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    pdf_writer.save(temp_file.name)
    pdf_writer.close()

    return FileResponse(temp_file.name, filename="exported_pages.pdf", media_type="application/pdf")

@app.post("/pages/export")
def export_pages_simple(payload: SimpleExportRequest):
    session = get_session()
    pages = [session.get(Page, pid) for pid in payload.page_ids if pid is not None]

    pdf_writer = fitz.open()
    for page in pages:
        if page:
            src_path = UPLOAD_DIR / page.pdf_name
            src_doc = fitz.open(src_path)
            pdf_writer.insert_pdf(src_doc, from_page=page.page_number - 1, to_page=page.page_number - 1)

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    pdf_writer.save(temp_file.name)
    pdf_writer.close()

    return FileResponse(temp_file.name, filename="exported_pages.pdf", media_type="application/pdf")

@app.get("/graph")
def get_graph():
    session = get_session()
    pages = session.exec(select(Page)).all()
    nodes = []
    edges = []
    tag_index = {}

    # Add page nodes
    for p in pages:
        nodes.append({
            "data": {"id": f"page-{p.id}", "label": f"Page {p.page_number}", "type": "page", "pdf": p.pdf_name} })

        if p.tags:
            for tag in [t.strip().lower() for t in p.tags.split(",") if t.strip()]:
                tag_id = f"tag-{tag}"
                if tag_id not in tag_index:
                    nodes.append({"data": {"id": tag_id, "label": tag, "type": "tag"}})
                    tag_index[tag_id] = True
                edges.append({"data": {"source": f"page-{p.id}", "target": tag_id}})

    return JSONResponse(content={"nodes": nodes, "edges": edges})

@app.get("/render_preview/")
def render_preview(pdf_name: str = Query(...), page: int = Query(...)):
    pdf_path = os.path.join("uploads", pdf_name)
    if not os.path.exists(pdf_path):
        return {"error": "PDF not found"}
    image_path = render_page_preview(pdf_path, page)
    return FileResponse(image_path)

def clean_pdf_text(text):
    # 1. Collapse "vertical" letter stacks: C\nH\nA\nP\nT\nE\nR\n3 => CHAPTER 3
    def fix_vertical(match):
        return ''.join(line.strip() for line in match.group(0).split('\n') if line.strip()) + '\n'
    text = re.sub(r'((?:^[A-Z0-9]\n){2,})', fix_vertical, text, flags=re.MULTILINE)
    
    # 2. Replace 2+ newlines with just one (normalize spacing)
    text = re.sub(r'\n{2,}', '\n', text)
    
    # 3. Optionally, collapse single newlines in middle of sentences (for extra aggressive cleaning)
    # text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    
    return text.strip()

@app.post("/admin/generate_previews")
def admin_generate_previews(key: str = Depends(check_admin)):
    try:
        result = subprocess.run(
            ["python", "scripts/generate_previews.py"], capture_output=True, text=True, check=True
        )
        return {"status": "ok", "output": result.stdout}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.post("/admin/ingest_folder")
def admin_ingest_folder(key: str = Depends(check_admin)):
    try:
        result = subprocess.run(
            ["python", "scripts/ingest_folder.py"], capture_output=True, text=True, check=True
        )
        return {"status": "ok", "output": result.stdout}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.post("/admin/reset_pages")
def admin_reset_pages(key: str = Depends(check_admin)):
    try:
        # 1. Run your DB reset script
        result = subprocess.run(
            ["python", "reset_pages.py"], capture_output=True, text=True, check=True
        )
        output = result.stdout

        # 2. Clear FAISS index (in memory)
        global index  # assumes index is defined globally at module level
        if 'index' in globals():
            index.clear()
            output += "\nFAISS index cleared."
        else:
            output += "\nWarning: FAISS index not found in globals."

        # 3. Clear graph (if you have one)
        global graph  # assumes you have a graph object globally
        if 'graph' in globals():
            if hasattr(graph, "clear"):
                graph.clear()
                output += "\nGraph structure cleared."
            else:
                output += "\nWarning: graph object has no .clear() method."
        else:
            output += "\n(No graph object found—skipping graph reset.)"

        print(output)
        return {"status": "ok", "output": output}

    except Exception as e:
        return {"status": "error", "error": str(e)}
    
@app.get("/admin/top10")
def admin_top10():
    session = get_session()
    # Most recent 10 PDFs by name (could also group by pdf_path if you want folder granularity)
    recent_pdfs = session.exec(
        select(Page.pdf_name)
        .group_by(Page.pdf_name)
        .order_by(func.max(Page.id).desc())
        .limit(10)
    ).all()

    # Top 10 tags
    all_tags = session.exec(select(Page.tags)).all()
    tag_counts = {}
    for tag_str in all_tags:
        if tag_str:
            for tag in tag_str.split(","):
                t = tag.strip()
                if t:
                    tag_counts[t] = tag_counts.get(t, 0) + 1
    top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # Top 10 folders (by occurrence in pdf_path)
    all_paths = session.exec(select(Page.pdf_path)).all()
    folder_counts = {}
    for path in all_paths:
        if path and ("/" in path or "\\" in path):
            folders = os.path.dirname(path).replace("\\", "/").split("/")
            for f in folders:
                if f:
                    folder_counts[f] = folder_counts.get(f, 0) + 1
    top_folders = sorted(folder_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "recent_pdfs": recent_pdfs,
        "top_tags": top_tags,
        "top_folders": top_folders
    }

@app.get("/admin/embedding_status")
def admin_embedding_status():
    session = get_session()
    # Count pages with and without embeddings, grouped by pdf_name
    
    result = session.exec(
        select(
            Page.pdf_name,
            func.count().label("total"),
            func.sum(case((Page.embedding == None, 1), else_=0)).label("missing")
        ).group_by(Page.pdf_name)
    ).all()
    return [{"pdf_name": r[0], "total": r[1], "missing": r[2]} for r in result]

@app.post("/pages/{page_id}/vision_annotate")
def vision_annotate(page_id: int):
    session = get_session()
    page = session.get(Page, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    preview_path = f"uploads/previews/{page.pdf_name}-page{page.page_number}.png"
    if not os.path.exists(preview_path):
        raise HTTPException(status_code=404, detail="Preview image not found")

    prompt = vision_context_prompt(page.tags, page.text, extra_context="Elementary worksheet page.")

    vision_output = run_vision_model(preview_path, prompt)
    import json
    summary, vision_tags = "", []
    try:
        content = vision_output.strip()
        if content.startswith("```json"):
            content = content.split("```json")[-1].split("```")[0].strip()
        elif content.startswith("```"):
            content = content.split("```")[-1].split("```")[0].strip()
        data = json.loads(content)
        summary = data.get("vision_summary", "").strip()
        vision_tags = [t.strip() for t in data.get("tags", "").split(",") if t.strip()]
    except Exception as e:
        print("Could not parse vision output JSON, using raw output as summary:", e)
        summary = vision_output.strip()
        vision_tags = []

    page.vision_summary = summary

    # --- Merge tags ---
    tags_set = set([t.strip() for t in (page.tags or "").split(",") if t.strip()])
    tags_set.update(vision_tags)
    page.tags = ",".join(sorted(tags_set)) if tags_set else None

    session.add(page)
    session.commit()

    return {"status": "ok", "vision_summary": summary, "tags": vision_tags}

@app.post("/pages/{page_id}/vision_update")
def update_vision_summary(page_id: int, summary: str = Body(...)):
    session = get_session()
    page = session.get(Page, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    page.vision_summary = summary

    # --- Re-embed using vision summary + tags! ---
    embed_text = summary
    tag_list = page.tags.split(",") if page.tags else []
    if tag_list:
        embed_text += "\n[tags: " + ", ".join(tag_list) + "]"
    if embed_text and len(embed_text.strip()) > 10:
        try:
            embedding = get_embedding(embed_text)
            page.embedding = ",".join(map(str, embedding)) if embedding else None
        except Exception as e:
            print(f"Embedding failed for page {page_id}: {e}")
            page.embedding = None
    else:
        page.embedding = None

    session.add(page)
    session.commit()
    return {"status": "ok"}