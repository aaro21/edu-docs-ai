import os
import requests
from pathlib import Path

API_URL = "http://localhost:8000/upload_pdf/"
ROOT_DIR = Path("/Users/aaron/Downloads/MIF Copies from TC/1st Grade/Extra Practice")  # update this

def find_pdfs(directory):
    return [f for f in directory.rglob("*.pdf") if f.is_file()]

def upload_pdf(file_path: Path):
    rel_path = file_path.relative_to(ROOT_DIR)
    files = {"file": (str(rel_path), open(file_path, "rb"), "application/pdf")}
    response = requests.post(API_URL, files=files)
    if response.status_code == 200:
        print(f"✅ Uploaded: {rel_path}")
    else:
        print(f"❌ Failed: {rel_path} ({response.status_code})")

def main():
    pdf_files = find_pdfs(ROOT_DIR)
    print(f"Found {len(pdf_files)} PDF(s). Uploading...")
    for path in pdf_files:
        upload_pdf(path)

if __name__ == "__main__":
    main()
