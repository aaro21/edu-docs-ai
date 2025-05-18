from sqlmodel import SQLModel, create_engine, Session
from models import Page  # 👈 This is essential!

DATABASE_URL = "sqlite:///./pages.db"
engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)
