# 📚 EduDocs AI

EduDocs AI is an experimental platform that helps teachers upload, organize and search educational PDFs. It consists of a **FastAPI** backend and a **Next.js** frontend. Uploaded PDFs are parsed page by page so that each page can be tagged, embedded for semantic search and exported.

---

## 🚀 Features
- Upload individual PDFs or bulk ingest a folder
- Automatic text extraction using PyMuPDF
- Generates page thumbnails for quick previews
- Tags and embeddings for every page enabling semantic search
- Optional image based "Vision" annotation for pages that are mostly graphics
- Export selected pages as a new PDF
- Graph view showing relationships between tags and pages

---

## 🛠️ Tech Stack
- **Frontend**: Next.js + Tailwind CSS
- **Backend**: FastAPI running on Python 3.11
- **Database**: SQLite via SQLModel
- **Embeddings**: OpenAI API (text-embedding-3-small)
- **Containerization**: Docker & Docker Compose

---

## 📦 Directory Overview
```
project-root/
├── backend/               # FastAPI application
│   ├── main.py            # API routes and upload logic
│   ├── models.py          # SQLModel Page table
│   ├── database.py        # SQLite setup helpers
│   ├── embedding.py       # Wrapper around OpenAI embeddings
│   ├── faiss_index.py     # In‑memory FAISS search index
│   ├── llm_helpers.py     # Cleans text and generates tags via OpenAI
│   ├── pdf_preview.py     # Renders page thumbnails
│   ├── vision.py          # Vision model helper
│   ├── reset_pages.py     # Clears the page database
│   └── scripts/           # Utility scripts
│       ├── backfill_tags_from_paths.py
│       └── generate_previews.py
├── frontend/              # Next.js user interface
│   ├── pages/             # Application routes
│   │   ├── index.js       # Upload page
│   │   ├── files.js       # List uploaded PDFs
│   │   ├── file.js        # Per-file page management
│   │   ├── search.js      # Semantic search and export
│   │   ├── vision_edit/[page_id].js # Edit vision summaries
│   │   ├── graph.js       # Tag/page graph view
│   │   └── admin.js       # Admin utilities
│   ├── components/        # Reusable React components
│   │   └── Layout.js
│   └── styles/
├── scripts/               # Stand‑alone utilities
│   └── ingest_folder.py   # Example script to bulk upload PDFs
├── docker-compose.yml     # Development containers
└── README.md
```

---

## ⚙️ Environment Variables
The backend expects several OpenAI related variables which can be provided via `.env` or your host environment:
- `OPENAI_API_KEY` – API key for embedding and vision endpoints
- `OPENAI_ENDPOINT` – base URL if using Azure OpenAI
- `AZURE_OPENAI_EMBED_DEPLOYMENT` – embedding deployment name
- `AZURE_OPENAI_VISION_DEPLOYMENT` – vision/chat deployment name
- `AZURE_OPENAI_API_VERSION` – API version string

---

## 🧪 Getting Started
### 1. Clone the Repo
```bash
git clone https://github.com/your-username/edu-docs-ai.git
cd edu-docs-ai
```

### 2. Launch with Docker
```bash
docker-compose up --build
```
This starts both the FastAPI server on **localhost:8000** and the Next.js app on **localhost:3000**.

### 3. Useful Commands
```bash
docker-compose down                   # Stop containers
python scripts/ingest_folder.py        # Example bulk ingest
```

---

## 🧩 Upcoming Ideas
- Improved semantic search ranking
- Document summaries and exports
- Authentication for multi‑user use

---

## 💡 License
MIT

This project was originally built to assist teachers in organizing their worksheets. Enjoy!
