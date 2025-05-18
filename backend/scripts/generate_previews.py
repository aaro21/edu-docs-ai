import fitz
import os

uploads_dir = "uploads"
previews_dir = os.path.join(uploads_dir, "previews")
os.makedirs(previews_dir, exist_ok=True)

for fname in os.listdir(uploads_dir):
    if fname.endswith(".pdf"):
        pdf_path = os.path.join(uploads_dir, fname)
        doc = fitz.open(pdf_path)
        for i in range(doc.page_count):
            page = doc[i]
            pix = page.get_pixmap(dpi=120)
            out_name = f"{fname}-page{i+1}.png"
            out_path = os.path.join(previews_dir, out_name)
            if not os.path.exists(out_path):
                pix.save(out_path)
                print(f"Saved {out_path}")
print("Done.")
