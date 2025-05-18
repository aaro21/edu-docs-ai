# scripts/backfill_tags_from_paths.py
from pathlib import Path
from sqlmodel import select
from database import get_session
from models import Page


def backfill_tags():
    session = get_session()
    pages = session.exec(select(Page)).all()
    updated = 0

    for page in pages:
        if page.tags:
            continue  # Skip already tagged pages

        try:
            parts = Path(page.pdf_name).parts[:-1]  # Exclude actual filename
            tags = [p for p in parts if "." not in p]  # Filter out non-informative parts
            page.tags = ", ".join(tags)
            session.add(page)
            updated += 1
        except Exception as e:
            print(f"Failed to process: {page.pdf_name} — {e}")

    session.commit()
    print(f"✅ Backfilled tags for {updated} pages.")


if __name__ == "__main__":
    backfill_tags()
