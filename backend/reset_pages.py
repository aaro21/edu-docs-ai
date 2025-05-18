from database import get_session
from models import Page

def clear_pages():
    session = get_session()
    count = session.query(Page).delete()
    session.commit()
    print(f"🧹 Deleted {count} pages from the database.")

if __name__ == "__main__":
    clear_pages()
