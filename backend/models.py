from sqlmodel import SQLModel, Field
from typing import Optional

class Page(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pdf_name: str
    pdf_path: Optional[str] = None   # <--- add this line!
    page_number: int
    text: str
    tags: Optional[str] = None
    embedding: Optional[str] = None
    vision_summary: Optional[str] = None
