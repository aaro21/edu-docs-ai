import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

AZURE_OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_ENDPOINT = os.environ.get("OPENAI_ENDPOINT")
AZURE_OPENAI_VISION_DEPLOYMENT = os.environ.get("AZURE_OPENAI_VISION_DEPLOYMENT", "gpt-4")  # This is your *deployment name*, e.g., "gpt-4"
AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

client = OpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    base_url=f"{OPENAI_ENDPOINT}openai/deployments/{AZURE_OPENAI_VISION_DEPLOYMENT}/",
    default_query={"api-version": AZURE_OPENAI_API_VERSION},
)

def clean_text_and_generate_tags(raw_text: str) -> tuple[str, list[str]]:
    prompt = f"""You are an assistant helping a teacher with educational documents.
Given the following raw worksheet text, do these two things:
1. Clean up and format the text for readability (fix line breaks, remove strange symbols, improve clarity, keep it natural for teachers).
2. Suggest up to 3 comma-separated relevant tags for this page (such as 'addition', 'shapes', 'story', 'reading', etc).

Respond in this JSON format:
{{
  "cleaned_text": "...",
  "tags": "tag1, tag2, tag3"
}}

Raw worksheet text:
\"\"\"
{raw_text}
\"\"\"
"""

    completion = client.chat.completions.create(
        model=AZURE_OPENAI_VISION_DEPLOYMENT,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=700,
        temperature=0.2,
    )

    for choice in completion.choices:
        try:
            content = choice.message.content.strip()
            if content.startswith("```json"):
                content = content.split("```json")[-1].split("```")[0].strip()
            elif content.startswith("```"):
                content = content.split("```")[-1].split("```")[0].strip()
            data = json.loads(content)
            cleaned = data.get("cleaned_text", "").strip()
            tags = [t.strip() for t in data.get("tags", "").split(",") if t.strip()]
            return cleaned, tags
        except Exception:
            continue
    return raw_text.strip(), []
