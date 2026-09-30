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


def create_index(embeddings, metadata):
    """Create and save a FAISS index with its metadata."""

    if len(embeddings) == 0:
        raise ValueError("No text chunks available to create the index.")

    embeddings = np.asarray(embeddings, dtype="float32")

    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(embeddings)

    faiss.write_index(index, INDEX_PATH)

    with open(METADATA_PATH, "w", encoding="utf-8") as file:
        json.dump(metadata, file, ensure_ascii=False, indent=4)


def search(query_embedding, top_k=5):
    """Search the saved FAISS index and return matching chunks."""

    if not os.path.exists(INDEX_PATH):
        return []

    if not os.path.exists(METADATA_PATH):
        return []

    index = faiss.read_index(INDEX_PATH)

    with open(METADATA_PATH, "r", encoding="utf-8") as file:
        metadata = json.load(file)

    query_embedding = np.asarray(
        query_embedding,
        dtype="float32"
    ).reshape(1, -1)

    top_k = min(top_k, index.ntotal)

    scores, indices = index.search(query_embedding, top_k)

    results = []

    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue

        results.append({
            "score": float(score),
            "text": metadata[idx]["text"],
            "page": metadata[idx]["page"],
            "filename": metadata[idx]["filename"]
        })

    return results