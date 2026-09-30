from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import os
import shutil

from services.pdf_processor import (
    extract_text_from_pdf,
    chunk_text
)

from services.embeddings import (
    create_embeddings,
    create_query_embedding
)

from services.vector_store import (
    create_index,
    search
)

from services.ai import (
    generate_summary,
    answer_question,
    generate_flashcards
)


app = FastAPI(
    title="Semantic Notes API"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


UPLOAD_DIR = "data/uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")
def home():

    return {
        "message": "Semantic Notes API is running"
    }


@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...)
):

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    pages = extract_text_from_pdf(
        file_path
    )

    all_chunks = []
    metadata = []

    for page in pages:

        chunks = chunk_text(
            page["text"]
        )

        for chunk in chunks:

            all_chunks.append(chunk)

            metadata.append({
                "page": page["page"],
                "text": chunk,
                "filename": file.filename
            })

    embeddings = create_embeddings(
        all_chunks
    )

    create_index(
        embeddings,
        metadata
    )

    return {
        "message": "PDF processed successfully",
        "filename": file.filename,
        "pages": len(pages),
        "chunks": len(all_chunks)
    }


@app.get("/search")
def semantic_search(
    query: str,
    top_k: int = 5
):

    query_embedding = create_query_embedding(
        query
    )

    results = search(
        query_embedding,
        top_k
    )

    return {
        "query": query,
        "results": results
    }


@app.post("/ask")
def ask_question(question: str):

    query_embedding = create_query_embedding(
        question
    )

    results = search(
        query_embedding,
        5
    )

    context = "\n\n".join(
        [
            result["text"]
            for result in results
        ]
    )

    answer = answer_question(
        question,
        context
    )

    return {
        "question": question,
        "answer": answer,
        "sources": results
    }


@app.post("/summary")
def summary():

    results = search(
        create_query_embedding(
            "important concepts definitions key points"
        ),
        10
    )

    context = "\n\n".join(
        [
            result["text"]
            for result in results
        ]
    )

    result = generate_summary(
        context
    )

    return {
        "summary": result
    }


@app.post("/flashcards")
def flashcards():

    results = search(
        create_query_embedding(
            "important concepts definitions examples"
        ),
        10
    )

    context = "\n\n".join(
        [
            result["text"]
            for result in results
        ]
    )

    cards = generate_flashcards(
        context
    )

    return {
        "flashcards": cards
    }