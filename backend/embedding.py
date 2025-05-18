# backend/embedding.py
import os
import requests
from dotenv import load_dotenv

load_dotenv()

AZURE_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")

headers = {
    "Content-Type": "application/json",
    "api-key": AZURE_API_KEY
}

def get_embedding(text: str) -> list[float]:
    url = f"{AZURE_ENDPOINT}/openai/deployments/{AZURE_DEPLOYMENT}/embeddings?api-version={AZURE_API_VERSION}"
    payload = {
        "input": text,
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    embedding = response.json()["data"][0]["embedding"]
    return embedding
