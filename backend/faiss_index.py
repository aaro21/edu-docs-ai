# backend/faiss_index.py

import faiss
import numpy as np
from typing import List, Tuple
from models import Page

class PageIndex:
    def __init__(self):
        self.index = faiss.IndexFlatL2(1536)  # 1536 dims for text-embedding-3-small
        self.page_map: List[Tuple[int, str]] = []  # (page_id, text)

    def add(self, page: Page, embedding: List[float]):
        vec = np.array([embedding], dtype='float32')
        self.index.add(vec)
        self.page_map.append((page.id, page.text))

    def search(self, query_embedding: List[float], top_k: int = 5):
        vec = np.array([query_embedding], dtype='float32')
        distances, indices = self.index.search(vec, top_k)
        results = []
        for i in indices[0]:
            if i < len(self.page_map):
                page_id, text = self.page_map[i]
                results.append({
                    "page_id": page_id,
                    "text": text
                })
        return results

    def clear(self):
        self.index = faiss.IndexFlatL2(1536)
        self.page_map = []
