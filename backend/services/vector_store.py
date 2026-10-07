import os
import json
import faiss
import numpy as np

# Store index files inside backend/data/index
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_DIR = os.path.join(BASE_DIR, "data", "index")

INDEX_PATH = os.path.join(INDEX_DIR, "notes.index")
METADATA_PATH = os.path.join(INDEX_DIR, "metadata.json")

os.makedirs(INDEX_DIR, exist_ok=True)


def get_index_stats():
    """Return health/status information about the FAISS vector index."""
    total_vectors = 0
    if os.path.exists(INDEX_PATH):
        try:
            index = faiss.read_index(INDEX_PATH)
            total_vectors = index.ntotal
        except Exception:
            total_vectors = 0

    total_metadata = 0
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                total_metadata = len(data)
        except Exception:
            total_metadata = 0

    return {
        "status": "ready" if total_vectors > 0 else "empty",
        "index_path": INDEX_PATH,
        "total_vectors": total_vectors,
        "total_metadata": total_metadata
    }


def add_to_index(embeddings, metadata):
    """
    Append new embeddings and metadata without overwriting existing documents.
    Supports multi-document and multi-course indexing.
    """
    if len(embeddings) == 0:
        return

    embeddings = np.asarray(embeddings, dtype="float32")
    dim = embeddings.shape[1]

    existing_metadata = []
    if os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
        try:
            index = faiss.read_index(INDEX_PATH)
            with open(METADATA_PATH, "r", encoding="utf-8") as file:
                existing_metadata = json.load(file)
        except Exception:
            index = faiss.IndexFlatIP(dim)
            existing_metadata = []
    else:
        index = faiss.IndexFlatIP(dim)
        existing_metadata = []

    index.add(embeddings)
    existing_metadata.extend(metadata)

    faiss.write_index(index, INDEX_PATH)
    with open(METADATA_PATH, "w", encoding="utf-8") as file:
        json.dump(existing_metadata, file, ensure_ascii=False, indent=4)


def create_index(embeddings, metadata):
    """
    Backward-compatible method: Appends to the index so previous notes are never wiped out.
    """
    add_to_index(embeddings, metadata)


def search(query_embedding, top_k=5, course_id=None, lesson_id=None):
    """
    Search the saved FAISS index and return matching chunks.
    Allows filtering by course_id and/or lesson_id.
    """
    if not os.path.exists(INDEX_PATH) or not os.path.exists(METADATA_PATH):
        return []

    try:
        index = faiss.read_index(INDEX_PATH)
        with open(METADATA_PATH, "r", encoding="utf-8") as file:
            metadata = json.load(file)
    except Exception:
        return []

    if index.ntotal == 0 or len(metadata) == 0:
        return []

    query_embedding = np.asarray(
        query_embedding,
        dtype="float32"
    ).reshape(1, -1)

    # If filtering, search over more candidates to find enough filtered results
    has_filter = course_id is not None or lesson_id is not None
    fetch_k = min(max(top_k * 10, 50), index.ntotal) if has_filter else min(top_k, index.ntotal)

    scores, indices = index.search(query_embedding, fetch_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1 or idx >= len(metadata):
            continue

        item = metadata[idx]

        # Apply course_id filter if provided
        if course_id is not None:
            item_course_id = item.get("course_id")
            if item_course_id is None or str(item_course_id) != str(course_id):
                continue

        # Apply lesson_id filter if provided
        if lesson_id is not None:
            item_lesson_id = item.get("lesson_id")
            if item_lesson_id is None or str(item_lesson_id) != str(lesson_id):
                continue

        results.append({
            "score": float(score),
            "text": item.get("text", ""),
            "page": item.get("page", 1),
            "filename": item.get("filename", "Document"),
            "course_id": item.get("course_id"),
            "lesson_id": item.get("lesson_id")
        })

        if len(results) >= top_k:
            break

    return results