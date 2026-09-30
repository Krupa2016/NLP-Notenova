from sentence_transformers import SentenceTransformer


model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)


def create_embeddings(texts):
    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    return embeddings


def create_query_embedding(query):
    embedding = model.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    return embedding