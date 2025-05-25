import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

AZURE_OPENAI_API_KEY = os.environ.get("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = "https://roberts-openi.openai.azure.com/"
AZURE_OPENAI_EMBED_DEPLOYMENT = os.environ.get("AZURE_OPENAI_EMBED_DEPLOYMENT", "text-embedding-3-small")
AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

client = OpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    base_url=f"{AZURE_OPENAI_ENDPOINT}openai/deployments/{AZURE_OPENAI_EMBED_DEPLOYMENT}/",
    default_query={"api-version": AZURE_OPENAI_API_VERSION},
)

def get_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        model=AZURE_OPENAI_EMBED_DEPLOYMENT,
        input=[text],
    )
    return response.data[0].embedding
