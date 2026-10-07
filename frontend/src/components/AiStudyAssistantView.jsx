import { useState, useEffect } from "react";
import {
  Search,
  Upload,
  FileText,
  Sparkles,
  BookOpen,
  Layers,
  MessageSquare,
  Brain,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  X,
  Send,
  Plus,
  CheckCircle2,
  FileUp,
  Terminal,
  Filter
} from "lucide-react";
import { api, API_URL } from "../api";
import { useAuth } from "../context/AuthContext";

export default function AiStudyAssistantView({ initialCourseId = null }) {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState("search"); // 'search', 'ask', 'summary', 'flashcards', 'pipeline'
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  // Course filtering support
  const [courses, setCourses] = useState([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState(initialCourseId ? String(initialCourseId) : "");

  const [summary, setSummary] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [terminalLogs, setTerminalLogs] = useState([
    { type: "cmd", text: "notesense pipeline --engine=faiss --chunker=sentence_transformers" },
    { type: "info", text: "Ready. Select a PDF study document to begin ingestion pipeline." },
  ]);

  useEffect(() => {
    api.getCourses().then((res) => {
      setCourses(res.courses || []);
    }).catch(() => {});
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setTerminalLogs((prev) => [
        ...prev,
        { type: "error", text: "Error: No PDF selected. Please choose a file first." },
      ]);
      return;
    }

    setTerminalLogs((prev) => [
      ...prev,
      { type: "cmd", text: `notesense pipeline --file="${file.name}" --embed` },
      { type: "info", text: `[1/4] Uploading "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...` },
    ]);

    try {
      setLoading(true);
      const data = await api.uploadGenericPdf(file);
      setUploadedFile(data);

      setTerminalLogs((prev) => [
        ...prev,
        { type: "info", text: `[2/4] PyMuPDF parsed ${data.pages} page(s) successfully.` },
        { type: "info", text: `[3/4] Text partitioned into ${data.chunks} semantic chunks.` },
        { type: "info", text: `[4/4] Embeddings indexed in FAISS vector store.` },
        { type: "success", text: `✔ Ingestion complete: ${data.pages} pages, ${data.chunks} chunks generated!` },
      ]);
    } catch (error) {
      console.error("Upload error:", error);
      setTerminalLogs((prev) => [
        ...prev,
        { type: "error", text: `✖ Ingestion error: ${error.message}. Is backend running at ${API_URL}?` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const courseId = selectedCourseFilter ? Number(selectedCourseFilter) : null;
      const data = await api.searchNotes(query, 5, courseId);
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      alert("Could not perform semantic search.");
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) {
      alert("Please enter a question.");
      return;
    }
    try {
      setLoading(true);
      const courseId = selectedCourseFilter ? Number(selectedCourseFilter) : null;
      const data = await api.askQuestion(question, courseId);
      setAnswer(data.answer || "");
    } catch (error) {
      console.error("Ask AI error:", error);
      alert("Could not generate an answer.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
      const courseId = selectedCourseFilter ? Number(selectedCourseFilter) : null;
      const data = await api.generateSummary(courseId);
      setSummary(data.summary || "");
    } catch (error) {
      console.error("Summary error:", error);
      alert("Could not generate summary.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    try {
      setLoading(true);
      const courseId = selectedCourseFilter ? Number(selectedCourseFilter) : null;
      const data = await api.generateFlashcards(courseId);
      setFlashcards(data.flashcards || []);
    } catch (error) {
      console.error("Flashcards error:", error);
      alert("Could not generate flashcards.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant-wrapper">
      {/* Header */}
      <section className="welcome-section">
        <div className="eyebrow">
          <Sparkles size={14} /> AI STUDY & KNOWLEDGE RETRIEVAL ASSISTANT
        </div>
        <h1>
          Your Notes & Courseware.
          <br />
          <span>One Intelligent Neural Engine.</span>
        </h1>
        <p className="welcome-description">
          Search semantic concepts, converse with your study materials, generate revision summaries, 
          and practice with interactive active recall flashcards.
        </p>

        {/* Course Filter Selector */}
        <div className="assistant-scope-selector">
          <label><Filter size={14} /> Search Scope:</label>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="scope-dropdown"
          >
            <option value="">🌐 All Uploaded Notes & Documents</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                📚 Course: {c.title}
              </option>
            ))}
          </select>
          {selectedCourseFilter && (
            <span className="scope-active-pill">
              Filtered to: {courses.find((c) => String(c.id) === selectedCourseFilter)?.title}
            </span>
          )}
        </div>
      </section>

      {/* Sub Tabs */}
      <div className="assistant-subtabs-bar">
        <button
          className={`assistant-tab-btn ${subTab === "search" ? "active" : ""}`}
          onClick={() => setSubTab("search")}
        >
          <Search size={16} /> Semantic Search
        </button>
        <button
          className={`assistant-tab-btn ${subTab === "ask" ? "active" : ""}`}
          onClick={() => setSubTab("ask")}
        >
          <MessageSquare size={16} /> Ask AI
        </button>
        <button
          className={`assistant-tab-btn ${subTab === "summary" ? "active" : ""}`}
          onClick={() => setSubTab("summary")}
        >
          <Brain size={16} /> AI Summary
        </button>
        <button
          className={`assistant-tab-btn ${subTab === "flashcards" ? "active" : ""}`}
          onClick={() => setSubTab("flashcards")}
        >
          <Layers size={16} /> Flashcards
        </button>
        <button
          className={`assistant-tab-btn ${subTab === "pipeline" ? "active" : ""}`}
          onClick={() => setSubTab("pipeline")}
        >
          <Terminal size={16} /> Ingestion Pipeline
        </button>
      </div>

      {/* TAB 1: SEMANTIC SEARCH */}
      {subTab === "search" && (
        <div className="assistant-tab-content">
          {/* Upload card preserved from NoteSense */}
          <section className="upload-card">
            <div className="upload-icon">
              <FileUp size={25} />
            </div>

            <div className="upload-info">
              <h3>Upload study document</h3>
              <p>Upload PDF notes to vectorize into your knowledge base.</p>
              {file && <span className="selected-file">{file.name}</span>}
            </div>

            <label className="secondary-button">
              <Upload size={16} />
              Choose PDF
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  setFile(selected);
                  if (selected) {
                    setTerminalLogs((prev) => [
                      ...prev,
                      { type: "cmd", text: `file --select "${selected.name}" (${(selected.size / 1024).toFixed(1)} KB)` },
                      { type: "info", text: `Ready to process "${selected.name}". Click "Upload notes" to extract & index.` },
                    ]);
                  }
                }}
                hidden
              />
            </label>

            <button className="primary-button" onClick={handleUpload} disabled={loading}>
              {loading ? "Processing..." : "Upload notes"} <ChevronRight size={16} />
            </button>
          </section>

          {/* Search Bar */}
          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Semantic Search</h2>
                <p>Query concepts by semantic meaning rather than exact keywords.</p>
              </div>
              <span className="ai-label">
                <Sparkles size={12} /> FAISS VECTOR SEARCH
              </span>
            </div>

            <div className="search-container">
              <Search size={21} className="search-symbol" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ask a question or search for a concept (e.g. Porter Stemmer, Lemmatization, PCA)..."
              />
              {query && (
                <button className="clear-button" onClick={() => setQuery("")} aria-label="Clear search">
                  <X size={17} />
                </button>
              )}
              <button className="search-button" onClick={handleSearch} disabled={loading}>
                {loading ? "Searching..." : "Search"}
                <Search size={15} />
              </button>
            </div>

            <div className="suggestions">
              <span>Try:</span>
              {["Morphological Analysis", "Porter Stemmer algorithm", "Tokenization techniques", "Vector embeddings"].map(
                (item) => (
                  <button key={item} onClick={() => setQuery(item)}>
                    {item}
                  </button>
                )
              )}
            </div>
          </section>

          {/* Results List */}
          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Search Results</h2>
                <p>
                  {searchResults.length
                    ? `${searchResults.length} matching passages found in index`
                    : "Matching document passages will appear here"}
                </p>
              </div>
            </div>

            {searchResults.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Search size={27} />
                </div>
                <h3>Nothing searched yet</h3>
                <p>Enter a query above to retrieve matching passages from FAISS.</p>
              </div>
            ) : (
              <div className="results-list">
                {searchResults.map((result, index) => (
                  <article className="result-card" key={index}>
                    <div className="result-top">
                      <span className="result-number">MATCH 0{index + 1}</span>
                      <span className="match-score">{(result.score * 100).toFixed(1)}% match</span>
                    </div>

                    <h3>{result.filename || "Study Notes"}</h3>
                    <p>{result.text}</p>

                    <div className="result-footer">
                      <span>
                        <FileText size={14} />
                        {result.filename || "Study Document"}
                      </span>
                      <span>Page {result.page}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: ASK AI */}
      {subTab === "ask" && (
        <div className="assistant-tab-content">
          <div className="chat-card">
            <div className="chat-message assistant-message">
              <div className="message-icon"><Sparkles size={17} /></div>
              <div>
                <strong>NoteSense AI</strong>
                <p>
                  Hello! Ask me any conceptual question based on your uploaded notes or selected course. 
                  Answers are strictly grounded in retrieved FAISS passages.
                </p>
              </div>
            </div>

            {answer && (
              <div className="chat-message assistant-message">
                <div className="message-icon"><Sparkles size={17} /></div>
                <div>
                  <strong>NoteSense AI</strong>
                  <p style={{ whiteSpace: "pre-line" }}>{answer}</p>
                </div>
              </div>
            )}

            <div className="chat-input">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="Ask something about your study materials..."
              />
              <button onClick={handleAsk} disabled={loading} aria-label="Send question">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI SUMMARY */}
      {subTab === "summary" && (
        <div className="assistant-tab-content">
          {summary ? (
            <div className="result-card summary-display-card">
              <h3>Concise Notes Summary</h3>
              <p style={{ whiteSpace: "pre-line", lineHeight: "1.7" }}>{summary}</p>
              <div style={{ marginTop: "20px" }}>
                <button className="secondary-button-sm" onClick={handleGenerateSummary} disabled={loading}>
                  <RotateCw size={14} /> Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="notes-empty">
              <Brain size={36} />
              <h3>Ready to Summarize</h3>
              <p>Generate an exam-oriented summary from indexed course materials.</p>
              <button className="primary-button" onClick={handleGenerateSummary} disabled={loading}>
                {loading ? "Synthesizing Summary..." : "Generate Summary"} <Sparkles size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FLASHCARDS */}
      {subTab === "flashcards" && (
        <div className="assistant-tab-content">
          {flashcards && flashcards.length > 0 ? (
            <FlashcardDeck flashcards={flashcards} />
          ) : (
            <div className="notes-empty">
              <Layers size={36} />
              <h3>Interactive Active Recall Deck</h3>
              <p>Generate 3D flashcards synthesized from key definitions in your notes.</p>
              <button className="primary-button" onClick={handleGenerateFlashcards} disabled={loading}>
                {loading ? "Generating Flashcards..." : "Generate Flashcards"} <Sparkles size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: INGESTION PIPELINE TERMINAL */}
      {subTab === "pipeline" && (
        <div className="assistant-tab-content">
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-controls">
                <span className="terminal-dot terminal-dot-red" />
                <span className="terminal-dot terminal-dot-yellow" />
                <span className="terminal-dot terminal-dot-green" />
              </div>
              <div className="terminal-title">
                <Terminal size={13} />
                <span>notesense@pipeline: ~/pdf-vector-indexer.sh</span>
              </div>
              <span className={`terminal-badge ${uploadedFile ? "active" : "idle"}`}>
                {loading ? "PROCESSING" : uploadedFile ? "INDEXED" : "STANDBY"}
              </span>
            </div>

            {uploadedFile && (
              <div className="terminal-stats-bar">
                <div className="terminal-stat-item">
                  <span>📄 Pages:</span>
                  <strong className="terminal-stat-highlight">{uploadedFile.pages}</strong>
                </div>
                <div className="terminal-stat-item">
                  <span>🧩 Chunks:</span>
                  <strong className="terminal-stat-highlight">{uploadedFile.chunks}</strong>
                </div>
                <div className="terminal-stat-item">
                  <span>📁 File:</span>
                  <strong>{uploadedFile.filename}</strong>
                </div>
                <div className="terminal-stat-item">
                  <span>⚡ Status:</span>
                  <strong className="terminal-stat-success">INDEXED & READY</strong>
                </div>
              </div>
            )}

            <div className="terminal-body">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="terminal-line">
                  <span className="terminal-prompt">&gt;</span>
                  {log.type === "cmd" && <span className="terminal-text-cmd">{log.text}</span>}
                  {log.type === "info" && <span className="terminal-text-info">{log.text}</span>}
                  {log.type === "success" && <span className="terminal-text-success">{log.text}</span>}
                  {log.type === "error" && <span className="terminal-text-error">{log.text}</span>}
                </div>
              ))}
              {loading && (
                <div className="terminal-line">
                  <span className="terminal-prompt">&gt;</span>
                  <span className="terminal-text-info">Processing embeddings & building FAISS index...</span>
                  <span className="terminal-cursor" />
                </div>
              )}
              {!loading && (
                <div className="terminal-line">
                  <span className="terminal-prompt">$</span>
                  <span className="terminal-cursor" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// FLASHCARD DECK (Interactive 3D Flipping Card)
// -------------------------------------------------------------
function FlashcardDeck({ flashcards }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = (e) => {
    e?.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  const handleFlip = (e) => {
    e?.stopPropagation();
    setIsFlipped((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flashcards.length]);

  if (!flashcards || flashcards.length === 0) return null;

  const currentCard = flashcards[currentIndex];
  const progressPercent = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="flashcard-wrapper">
      <div className="flashcard-meta-header">
        <div className="flashcard-deck-indicator">
          <span>CARD</span> {currentIndex + 1} OF {flashcards.length}
        </div>
        <div className="flashcard-progress-track">
          <div
            className="flashcard-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flashcard-3d-scene" onClick={handleFlip}>
        <div className={`flashcard-rectangle-card ${isFlipped ? "is-flipped" : ""}`}>
          {/* Front: Question */}
          <div className="flashcard-face flashcard-face-front">
            <div className="flashcard-card-topbar">
              <span className="flashcard-type-tag flashcard-tag-question">
                <Sparkles size={11} /> Question
              </span>
              <span className="flashcard-flip-hint">
                <RotateCw size={12} /> Click or space to flip
              </span>
            </div>

            <div className="flashcard-card-body">
              <h3>{currentCard.question}</h3>
            </div>

            <div className="flashcard-card-footer">
              <span>NoteSense Active Recall</span>
              <span>Click or press space to reveal answer</span>
            </div>
          </div>

          {/* Back: Answer */}
          <div className="flashcard-face flashcard-face-back">
            <div className="flashcard-card-topbar">
              <span className="flashcard-type-tag flashcard-tag-answer">
                <CheckCircle2 size={12} /> Answer
              </span>
              <span className="flashcard-flip-hint">
                <RotateCw size={12} /> Click or space to flip back
              </span>
            </div>

            <div className="flashcard-card-body">
              <p>{currentCard.answer}</p>
            </div>

            <div className="flashcard-card-footer">
              <span>Verified from study notes</span>
              <span>Click to flip back</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flashcard-action-bar">
        <button className="secondary-button" onClick={handlePrev}>
          <ChevronLeft size={16} /> Prev
        </button>

        <div className="flashcard-dots-container">
          {flashcards.map((_, idx) => (
            <button
              key={idx}
              className={`flashcard-index-dot ${idx === currentIndex ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
                setCurrentIndex(idx);
              }}
              title={`Card ${idx + 1}`}
              aria-label={`Go to card ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flashcard-nav-group">
          <button className="secondary-button" onClick={handleFlip}>
            <RotateCw size={14} /> Flip
          </button>
          <button className="primary-button" onClick={handleNext}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flashcard-key-hints">
        Use <span className="flashcard-key-badge">←</span> <span className="flashcard-key-badge">→</span> to navigate, <span className="flashcard-key-badge">Space</span> to flip card
      </div>
    </div>
  );
}
