import os
from typing import Set
from jose import jwt, JWTError
from fastapi import HTTPException, Request

import psycopg2

_cached_emails: Set[str] | None = None

def load_allowed_emails() -> Set[str]:
    global _cached_emails
    if _cached_emails is not None:
        return _cached_emails
    env = os.environ.get("ALLOWED_EMAILS")
    if env:
        _cached_emails = {e.strip().lower() for e in env.split(',') if e.strip()}
        return _cached_emails
    db_url = os.environ.get("POSTGRES_URL")
    if db_url:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("SELECT email FROM allowed_users")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        _cached_emails = {r[0].lower() for r in rows}
        return _cached_emails
    _cached_emails = set()
    return _cached_emails

def verify_session(request: Request):
    if os.environ.get("NODE_ENV") != "production":
        return
    token = request.cookies.get("next-auth.session-token")
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        payload = jwt.decode(token, os.environ["NEXTAUTH_SECRET"], algorithms=["HS256"])
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        allowed = load_allowed_emails()
        if email.lower() not in allowed:
            raise HTTPException(status_code=403, detail="Access denied")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
