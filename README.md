# Notenova – Semantic Search for College Notes

Notenova is an AI-powered platform that helps students search, understand, and revise their college notes. It uses semantic search to find relevant information from uploaded PDFs, even when the exact keywords are not used.

## Features

* Upload and process PDF notes
* Search notes using natural language
* Get AI-generated answers from uploaded content
* Generate summaries and flashcards
* View relevant source pages

## Tech Stack

**Frontend:** React, Vite, CSS
**Backend:** Python, FastAPI
**AI & Search:** Sentence Transformers, FAISS, Gemini API
**PDF Processing:** PyMuPDF

## Project Structure

```text
Notenova/
├── backend/
│   ├── main.py
│   ├── services/
│   ├── data/
│   ├── .env
│   └── requirements.txt
└── frontend/
    ├── src/
    ├── package.json
    └── index.html
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Notenova
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

**Windows**

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```env
GEMINI_API_KEY=your_api_key_here
```

Run the backend:

```bash
python -m uvicorn main:app --reload
```

Backend URL: `http://127.0.0.1:8000`

API documentation: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## How It Works

1. Upload a PDF containing college notes.
2. The backend extracts and divides the text into smaller chunks.
3. Sentence Transformers converts the chunks into embeddings.
4. FAISS stores and searches the embeddings.
5. Relevant content is retrieved for user queries.
6. Gemini generates answers, summaries, and flashcards using the retrieved content.

## API Endpoints

| Method | Endpoint      | Description         |
| ------ | ------------- | ------------------- |
| GET    | `/`           | Check API status    |
| POST   | `/upload`     | Upload PDF notes    |
| GET    | `/search`     | Search notes        |
| POST   | `/ask`        | Ask questions       |
| POST   | `/summary`    | Generate summary    |
| POST   | `/flashcards` | Generate flashcards |

## Notes

* Python and Node.js must be installed.
* A valid Gemini API key is required for AI-powered features.
* Do not upload your `.env` file or API key to GitHub.
* Uploaded PDFs and generated indexes are stored locally.

## Future Improvements

* Support for multiple document formats
* Improved document management
* Chat history and saved searches
* More revision tools and personalized learning features

---

**Notenova** – Making college notes easier to search, understand, and revise.
