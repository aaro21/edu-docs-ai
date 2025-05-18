# 📚 EduDocs AI

An AI-powered web application to help teachers organize, search, and summarize educational documents. Built with FastAPI (Python) and Next.js (React), featuring document upload, PDF parsing, semantic search, and export features.

---

## 🚀 Features
- Upload PDFs (single files or large documents)
- Auto-parse and preview PDF content
- Document metadata extraction
- Built-in Docker setup for easy development

---

## 🛠️ Tech Stack
- **Frontend**: Next.js (React)
- **Backend**: FastAPI (Python 3.11)
- **PDF Parsing**: PyMuPDF
- **Containerization**: Docker + Docker Compose

---

## 📦 Project Structure
```
project-root/
├── backend/
│   ├── main.py
│   ├── Dockerfile
│   ├── requirements.txt
│
├── frontend/
│   ├── pages/
│   │   └── index.js
│   ├── Dockerfile
│   ├── package.json
│
├── uploads/               # Auto-created for storing uploaded files
├── docker-compose.yml
```

---

## 🧪 Getting Started

### 1. Clone the Repo
```bash
git clone https://github.com/your-username/edu-docs-ai.git
cd edu-docs-ai
```

### 2. Start the App
```bash
docker-compose up --build
```

### 3. Access the App
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧩 Upcoming Features
- Semantic search via FAISS / Qdrant
- Graph-based document relationships
- Document tagging & categorization
- Export + summary generation
- User authentication

---

## 💡 License
MIT

---

## 🙋‍♀️ Made for Teachers
This project was created to help educators like my wife manage their vast collections of teaching materials with the power of AI. ❤️
