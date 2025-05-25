import os
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

AZURE_OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_ENDPOINT = os.environ.get("OPENAI_ENDPOINT")
AZURE_OPENAI_VISION_DEPLOYMENT = os.environ.get("AZURE_OPENAI_VISION_DEPLOYMENT", "gpt-4")
AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

client = OpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    base_url=f"{OPENAI_ENDPOINT}openai/deployments/{AZURE_OPENAI_VISION_DEPLOYMENT}/",
    default_query={"api-version": AZURE_OPENAI_API_VERSION},
)

def run_vision_model(image_path: str, prompt: str) -> str:
    with open(image_path, "rb") as img_file:
        img_b64 = base64.b64encode(img_file.read()).decode("utf-8")
    content = [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}},
    ]
    response = client.chat.completions.create(
        model=AZURE_OPENAI_VISION_DEPLOYMENT,
        messages=[{"role": "user", "content": content}],
        max_tokens=512,
    )
    print("Full vision API response:", response)  # <--- Put this line here!
    try:
        return response.choices[0].message.content
    except Exception:
        print("No valid choices or message in response:", response)
        return ""
    
def vision_context_prompt(tags, extracted_text, extra_context=None):
    prompt = ""
    if tags:
        prompt += f"Existing tags: {tags}\n"
    if extra_context:
        prompt += extra_context + "\n"
    if extracted_text:
        prompt += 'Extracted text from the page:\n"""\n' + extracted_text.strip() + '\n"""\n'
    prompt += (
        "Please do two things for this worksheet page for an elementary school teacher:\n"
        "1. Summarize or describe the worksheet page for the teacher, as 'vision_summary'.\n"
        "2. Suggest up to 3 relevant comma-separated tags for searching, as 'tags'.\n"
        'Respond in this JSON format:\n'
        '{\n  \"vision_summary\": \"...\",\n  \"tags\": \"tag1, tag2, tag3\"\n}'
    )
    return prompt
