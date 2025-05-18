from sqlmodel import SQLModel, Field
from typing import Optional, List

class Page(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pdf_name: str
    page_number: int
    text: str
    tags: Optional[str] = None  # comma-separated tags for now
    embedding: Optional[str] = None  # placeholder for future vector
