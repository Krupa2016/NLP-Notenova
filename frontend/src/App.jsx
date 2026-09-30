import { useState } from "react";
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
  X,
  Menu,
  Send,
  Plus,
  CheckCircle2,
  FileUp,
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

  const handleSearch = () => {
    if (!query.trim()) return;

    setLoading(true);

    // Temporary demo result. Replace with API call later.
    setTimeout(() => {
      {searchResults.map((result, index) => (
  <div className="result-card" key={index}>
    <div className="result-card-header">
      <h3>{result.filename || "Your Notes"}</h3>
      <span>Page {result.page}</span>
    </div>

    <p>{result.text}</p>

    {result.score !== undefined && (
      <span className="result-score">
        Match: {(result.score * 100).toFixed(1)}%
      </span>
    )}
  </div>
))}
    }, 700);
  };

  const handleUpload = async () => {
  if (!file) {
    alert("Please select a PDF first.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    setLoading(true);

    const response = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("PDF upload failed.");
    }

    const data = await response.json();

    setUploadedFile(data);

    alert(
      `PDF processed successfully!\nPages: ${data.pages}\nChunks: ${data.chunks}`
    );
  } catch (error) {
    console.error("Upload error:", error);
    alert("Could not upload PDF. Check whether your backend is running.");
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
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                hidden
              />
            </label>

            <button className="primary-button" onClick={handleUpload}>
              Upload notes <ChevronRight size={16} />
            </button>
          </section>

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
                        {result.score} match
                      </span>
                    </div>

                    <h3>{result.title}</h3>
                    <p>{result.text}</p>

                    <div className="result-footer">
                      <span>
                        <FileText size={14} />
                        {file?.name || "Sample study notes"}
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

          <div className="notes-empty">
            <FileText size={32} />
            <h3>No notes uploaded yet</h3>
            <p>Your uploaded PDFs will appear here.</p>
            <button className="primary-button" onClick={() => setActivePage("Search")}>
              <Plus size={16} /> Upload notes
            </button>
          </div>
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
          <div className="notes-empty">
            <Layers size={32} />
            <h3>Your flashcards will appear here</h3>
            <p>Upload a PDF to generate your first set of cards.</p>
            <button className="primary-button" onClick={() => setActivePage("Search")}>
              Go to upload <ChevronRight size={16} />
            </button>
          </div>
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
        <div className="notes-empty">
          <Brain size={32} />
          <h3>Ready to summarize</h3>
          <p>Upload your PDF notes to get started.</p>
          <button className="primary-button" onClick={() => setActivePage("Search")}>
            Go to upload <ChevronRight size={16} />
          </button>
        </div>
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

export default App;