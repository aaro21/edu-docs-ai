import fitz  # PyMuPDF
import os

def render_page_preview(pdf_path, page_num, output_dir="uploads/previews", dpi=120):
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    page = doc[page_num - 1]
    pix = page.get_pixmap(dpi=dpi)
    output_path = os.path.join(
        output_dir,
        f"{os.path.basename(pdf_path)}-page{page_num}.png"
    )
    pix.save(output_path)
    return output_path
