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
  Menu,
  Send,
  Plus,
  CheckCircle2,
  FileUp,
  Terminal,
} from "lucide-react";

import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("Search");
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const API_URL = "http://127.0.0.1:8000";

  const [summary, setSummary] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [terminalLogs, setTerminalLogs] = useState([
    { type: "cmd", text: "semantic-notes init --engine=faiss --chunker=recursive" },
    { type: "info", text: "Ready. Select a PDF study document to begin ingestion pipeline." },
  ]);
const handleGenerateFlashcards = async () => {
  try {
    setLoading(true);

    const response = await fetch(`${API_URL}/flashcards`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Flashcard generation failed.");
    }

    const data = await response.json();
    setFlashcards(data.flashcards || []);
  } catch (error) {
    console.error("Flashcards error:", error);
    alert("Could not generate flashcards.");
  } finally {
    setLoading(false);
  }
};

const handleGenerateSummary = async () => {
  try {
    setLoading(true);

    const response = await fetch(`${API_URL}/summary`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Summary generation failed.");
    }

    const data = await response.json();
    setSummary(data.summary || "");
  } catch (error) {
    console.error("Summary error:", error);
    alert("Could not generate summary.");
  } finally {
    setLoading(false);
  }
};
  const navigation = [
    { name: "Search", icon: Search },
    { name: "Ask AI", icon: MessageSquare },
    { name: "My Notes", icon: BookOpen },
    { name: "Flashcards", icon: Layers },
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);

    try {
      const params = new URLSearchParams({ query: query, top_k: 5 });
      const response = await fetch(`${API_URL}/search?${params}`);
      
      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      alert("Could not perform search.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setTerminalLogs((prev) => [
        ...prev,
        { type: "error", text: "Error: No PDF selected. Please choose a file first." },
      ]);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setTerminalLogs((prev) => [
      ...prev,
      { type: "cmd", text: `notenova pipeline --file="${file.name}" --embed` },
      { type: "info", text: `[1/4] Uploading "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...` },
    ]);

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`PDF upload failed with status ${response.status}`);
      }

      const data = await response.json();
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
        { type: "error", text: `✖ Ingestion error: ${error.message}. Is your backend running at ${API_URL}?` },
      ]);
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

    const params = new URLSearchParams({
      question: question,
    });

    const response = await fetch(`${API_URL}/ask?${params}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Could not get an answer.");
    }

    const data = await response.json();

    setAnswer(data.answer || "");
  } catch (error) {
    console.error("Ask AI error:", error);
    alert("Could not generate an answer. Check your backend.");
  } finally {
    setLoading(false);
  }
};

  const renderContent = () => {
    if (activePage === "Search") {
      return (
        <>
          <section className="welcome-section">
            <div className="eyebrow">
              <Sparkles size={14} /> YOUR PERSONAL STUDY SPACE
            </div>

            <h1>
              Your notes.
              <br />
              <span>One intelligent search.</span>
            </h1>

            <p className="welcome-description">
              Search through your college notes by meaning, not just keywords.
              Learn faster with AI-powered study tools.
            </p>
          </section>

          <section className="upload-card">
            <div className="upload-icon">
              <FileUp size={25} />
            </div>

            <div className="upload-info">
              <h3>Upload your study material</h3>
              <p>Upload PDF notes to build your personal knowledge base.</p>
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

          {/* Small Terminal-like UI displaying pages, chunks, and ingestion pipeline */}
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-controls">
                <span className="terminal-dot terminal-dot-red" />
                <span className="terminal-dot terminal-dot-yellow" />
                <span className="terminal-dot terminal-dot-green" />
              </div>
              <div className="terminal-title">
                <Terminal size={13} />
                <span>notenova@pipeline: ~/pdf-processor.sh</span>
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

          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Semantic Search</h2>
                <p>What would you like to learn today?</p>
              </div>
              <span className="ai-label">
                <Sparkles size={12} /> AI POWERED
              </span>
            </div>

            <div className="search-container">
              <Search size={21} className="search-symbol" />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ask a question or search for a concept..."
              />

              {query && (
                <button
                  className="clear-button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={17} />
                </button>
              )}

              <button
                className="search-button"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
                <Search size={15} />
              </button>
            </div>

            <div className="suggestions">
              <span>Try:</span>
              {["Explain PCA", "Types of clustering", "Neural networks"].map(
                (item) => (
                  <button key={item} onClick={() => setQuery(item)}>
                    {item}
                  </button>
                )
              )}
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Search Results</h2>
                <p>
                  {searchResults.length
                    ? `${searchResults.length} matching passages found`
                    : "Your matching notes will appear here"}
                </p>
              </div>
            </div>

            {searchResults.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Search size={27} />
                </div>
                <h3>Nothing searched yet</h3>
                <p>
                  Upload your notes and enter a question to find relevant
                  passages.
                </p>
              </div>
            ) : (
              <div className="results-list">
                {searchResults.map((result, index) => (
                  <article className="result-card" key={index}>
                    <div className="result-top">
                      <span className="result-number">
                        MATCH 0{index + 1}
                      </span>
                      <span className="match-score">
                        {(result.score * 100).toFixed(1)}% match
                      </span>
                    </div>

                    <h3>{result.filename || "Your Notes"}</h3>
                    <p>{result.text}</p>

                    <div className="result-footer">
                      <span>
                        <FileText size={14} />
                        {result.filename || file?.name || "Sample study notes"}
                      </span>
                      <span>Page {result.page}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <h2>Study tools</h2>
                <p>Turn your notes into active learning material.</p>
              </div>
            </div>

            <div className="tools-grid">
              <ToolCard
                icon={<MessageSquare />}
                title="Ask AI"
                description="Get answers based on your uploaded notes."
                onClick={() => setActivePage("Ask AI")}
              />
              <ToolCard
                icon={<Brain />}
                title="Summarize"
                description="Convert lengthy notes into concise summaries."
                onClick={() => setActivePage("Summarize")}
              />
              <ToolCard
                icon={<Layers />}
                title="Flashcards"
                description="Generate questions for quick revision."
                onClick={() => setActivePage("Flashcards")}
              />
            </div>
          </section>
        </>
      );
    }

    if (activePage === "Ask AI") {
      return (
        <section className="page-panel">
          <div className="eyebrow">
            <Sparkles size={14} /> AI STUDY ASSISTANT
          </div>
          <h1>Ask your <span>notes.</span></h1>
          <p className="welcome-description">
            Ask questions and get answers grounded in your study material.
          </p>

          <div className="chat-card">
            <div className="chat-message assistant-message">
              <div className="message-icon"><Sparkles size={17} /></div>
              <div>
                <strong>NoteSense AI</strong>
                <p>
                  Hi! Ask me anything about your uploaded notes. I'll help you
                  understand concepts in simple language.
                </p>
              </div>
            </div>

            {answer && (
              <div className="chat-message assistant-message">
                <div className="message-icon"><Sparkles size={17} /></div>
                <div>
                  <strong>NoteSense AI</strong>
                  <p>{answer}</p>
                </div>
              </div>
            )}

            <div className="chat-input">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="Ask something about your notes..."
              />
              <button onClick={handleAsk} aria-label="Send question">
                <Send size={18} />
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (activePage === "My Notes") {
      return (
        <section className="page-panel">
          <div className="eyebrow"><BookOpen size={14} /> KNOWLEDGE BASE</div>
          <h1>My <span>Notes.</span></h1>
          <p className="welcome-description">
            Manage your uploaded study material in one place.
          </p>

          {uploadedFile ? (
            <div className="uploaded-details">
              <h3>{uploadedFile.filename}</h3>
              <p>Pages: {uploadedFile.pages} | Total Chunks: {uploadedFile.chunks}</p>
              
              <div className="chunks-list" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h4>Generated Chunks (Process Details)</h4>
                {uploadedFile.chunk_details && uploadedFile.chunk_details.map((chunk, index) => (
                  <div key={index} className="result-card" style={{ padding: '15px', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div className="result-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span>Chunk {index + 1}</span>
                      <span>Page {chunk.page}</span>
                    </div>
                    <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{chunk.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="notes-empty">
              <FileText size={32} />
              <h3>No notes uploaded yet</h3>
              <p>Your uploaded PDFs will appear here.</p>
              <button className="primary-button" onClick={() => setActivePage("Search")}>
                <Plus size={16} /> Upload notes
              </button>
            </div>
          )}
        </section>
      );
    }

    if (activePage === "Flashcards") {
      return (
        <section className="page-panel">
          <div className="eyebrow"><Layers size={14} /> ACTIVE RECALL</div>
          <h1>Learn through <span>flashcards.</span></h1>
          <p className="welcome-description">
            Generate revision cards from your uploaded college notes.
          </p>
          {flashcards && flashcards.length > 0 ? (
            <FlashcardDeck flashcards={flashcards} />
          ) : (
            <div className="notes-empty">
              <Layers size={32} />
              <h3>Your flashcards will appear here</h3>
              <p>Generate revision cards from your notes.</p>
              <button className="primary-button" onClick={handleGenerateFlashcards} disabled={loading}>
                {loading ? "Generating..." : "Generate Flashcards"} <Sparkles size={16} />
              </button>
            </div>
          )}
        </section>
      );
    }

    return (
      <section className="page-panel">
        <div className="eyebrow"><Brain size={14} /> AI SUMMARY</div>
        {summary && (
  <div className="result-card">
    <h3>Your Summary</h3>
    <p>{summary}</p>
  </div>
)}
        <h1>Understand more. <span>Read less.</span></h1>
        <p className="welcome-description">
          Generate concise summaries from your study material.
        </p>
        {!summary && (
          <div className="notes-empty">
            <Brain size={32} />
            <h3>Ready to summarize</h3>
            <p>Generate an AI summary of your uploaded notes.</p>
            <button className="primary-button" onClick={handleGenerateSummary} disabled={loading}>
              {loading ? "Generating..." : "Generate Summary"} <Sparkles size={16} />
            </button>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><Brain size={21} /></div>
          <span>Note<span className="brand-purple">Sense</span></span>
          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`nav-link ${activePage === item.name ? "active" : ""}`}
                onClick={() => {
                  setActivePage(item.name);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} />
                {item.name}
                {activePage === item.name && <span className="active-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="storage-card">
            <div className="storage-icon"><FileText size={16} /></div>
            <div>
              <strong>Knowledge base</strong>
              <p>Your personal study library</p>
            </div>
          </div>

          <div className="profile">
            <div className="avatar">U</div>
            <div>
              <strong>My Workspace</strong>
              <span>Student account</span>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>

          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <span className="system-status">
              <i /> System ready
            </span>
            <div className="top-avatar">U</div>
          </div>
        </header>

        <div className="content-area">{renderContent()}</div>

        <footer className="footer">
          <span>© 2026 NoteSense</span>
          <span>Learn smarter, not harder.</span>
        </footer>
      </main>
    </div>
  );
}

function ToolCard({ icon, title, description, onClick }) {
  return (
    <button className="tool-card" onClick={onClick}>
      <div className="tool-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="tool-arrow"><ChevronRight size={17} /></span>
    </button>
  );
}

function FlashcardDeck({ flashcards }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

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

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  if (!flashcards || flashcards.length === 0) return null;

  const currentCard = flashcards[currentIndex];
  const progressPercent = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="flashcard-wrapper">
      {/* Top Meta Header: Card counter and sleek progress bar */}
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

      {/* 3D Flip Scene: Rectangular Card UI */}
      <div
        className="flashcard-3d-scene"
        onClick={handleFlip}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
              <span>Swipe or click to reveal answer</span>
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

      {/* Bottom Controls Bar */}
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

export default App;