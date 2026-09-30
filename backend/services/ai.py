import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel(
    "gemini-2.5-flash"
)


def generate_summary(context):

    prompt = f"""
You are a college study assistant.

Summarize the following content from the student's notes.

Rules:
- Use only the provided notes.
- Keep it easy to understand.
- Highlight important concepts.
- Use bullet points where useful.
- Do not add information that is not present.

NOTES:

{context}
"""

    response = model.generate_content(prompt)

    return response.text


def answer_question(question, context):

    prompt = f"""
You are an AI assistant for college students.

Answer the student's question using ONLY the provided notes.

If the answer is not available in the notes, say:
"I couldn't find this information in the uploaded notes."

Keep the answer concise and exam-friendly.

QUESTION:
{question}

NOTES:
{context}
"""

    response = model.generate_content(prompt)

    return response.text


def generate_flashcards(context):

    prompt = f"""
Create 5 useful exam-oriented flashcards from these college notes.

Return them in this format:

Q: question
A: answer

Use only information present in the notes.

NOTES:
{context}
"""

    response = model.generate_content(prompt)

    return response.text