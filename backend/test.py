from services.embeddings import create_embeddings


texts = [
    "Stemming reduces a word to its root form.",
    "Lemmatization converts words into their dictionary form.",
    "Natural language processing deals with human language."
]


embeddings = create_embeddings(texts)


print("================================")
print("EMBEDDING TEST")
print("================================")

print("Number of texts:", len(texts))

print("Embedding shape:", embeddings.shape)

print("\nFirst embedding:")
print(embeddings[0])