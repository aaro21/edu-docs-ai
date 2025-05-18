# // backend/main.py
from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import fitz  # PyMuPDF
from pathlib import Path
from typing import List, Optional
import hashlib
import tempfile

from models import Page
from database import init_db, get_session
from sqlmodel import SQLModel, select
from pydantic import BaseModel

from embedding import get_embedding
from faiss_index import PageIndex
import numpy as np

app = FastAPI()

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
index = PageIndex()

# Rebuild FAISS index from existing DB entries
session = get_session()
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

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    file_location = UPLOAD_DIR / file.filename
    file_location.parent.mkdir(parents=True, exist_ok=True)

    with open(file_location, "wb") as f:
        f.write(await file.read())

    # Extract folder-based tags from file path (if available)
    path_parts = Path(file.filename).parts
    folder_tags = [part for part in path_parts[:-1] if "." not in part]  # exclude filename
    tag_string = ", ".join(folder_tags)

    doc = fitz.open(file_location)
    session = get_session()
    pages = []

    for i in range(doc.page_count):
        text = doc[i].get_text()
        embedding = get_embedding(text)
        page = Page(
            pdf_name=file.filename,
            page_number=i + 1,
            text=text,
            embedding=",".join(map(str, embedding)),
            tags=tag_string
        )
        session.add(page)
        session.flush()
        index.add(page, embedding)
        pages.append(text)

    session.commit()

    metadata = {
        "filename": file.filename,
        "page_count": doc.page_count,
        "pages": pages[:3]
    }
    return metadata

@app.get("/tags")
def list_all_tags():
    session = get_session()
    pages = session.exec(select(Page)).all()
    tag_set = set()
    for p in pages:
        if p.tags:
            tags = [t.strip().lower() for t in p.tags.split(",") if t.strip()]
            tag_set.update(tags)
    return sorted(tag_set)

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

@app.patch("/pages/{page_id}/tags")
def update_page_tags(page_id: int, payload: TagUpdate):
    session = get_session()
    page = session.get(Page, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    page.tags = payload.tags
    session.add(page)
    session.commit()
    return {"message": "Tags updated", "page_id": page_id, "tags": page.tags}

@app.get("/files")
def list_uploaded_files():
    session = get_session()
    result = session.exec(select(Page.pdf_name)).all()
    file_counts = {}
    for name in result:
        if name in file_counts:
            file_counts[name] += 1
        else:
            file_counts[name] = 1
    return [{"pdf_name": name, "page_count": count} for name, count in file_counts.items()]

@app.get("/pages_by_pdf")
def get_pages_by_pdf(pdf_name: str):
    session = get_session()
    pages = session.exec(select(Page).where(Page.pdf_name == pdf_name)).all()
    return [
        {
            "page_id": p.id,
            "text": p.text,
            "page_number": p.page_number,
            "tags": p.tags or ""
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
