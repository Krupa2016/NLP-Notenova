import fitz


def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    pages = []

    for page_number, page in enumerate(doc):
        text = page.get_text()

        if text.strip():
            pages.append({
                "page": page_number + 1,
                "text": text
            })

    doc.close()
    return pages


def chunk_text(text, chunk_size=100, overlap=20):
    words = text.split()
    chunks = []

    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])

        if chunk.strip():
            chunks.append(chunk)

        start += chunk_size - overlap

    return chunks