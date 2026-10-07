import { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Clock,
  FileText,
  Sparkles,
  Download,
  Brain,
  MessageSquare,
  Layers,
  Send,
  X,
  PlayCircle
} from "lucide-react";
import { api, API_URL } from "../api";
import { useAuth } from "../context/AuthContext";

export default function CoursePlayerView({ courseId, initialLessonId, onBack }) {
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  // Lesson AI Study Assistant Drawer
  const [aiTool, setAiTool] = useState(null); // 'ask', 'summary', 'flashcards'
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiFlashcards, setAiFlashcards] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const loadCourseAndLesson = async (lessonIdToSelect = null) => {
    try {
      setLoading(true);
      const res = await api.getCourseDetail(courseId);
      const courseData = res.course;
      setCourse(courseData);

      // Find all lessons in flat list
      const flatLessons = [];
      courseData.modules?.forEach((m) => {
        m.lessons?.forEach((l) => flatLessons.push(l));
      });

      let target = null;
      if (lessonIdToSelect) {
        target = flatLessons.find((l) => l.id === lessonIdToSelect);
      } else if (courseData.last_accessed_lesson_id) {
        target = flatLessons.find((l) => l.id === courseData.last_accessed_lesson_id);
      }
      if (!target && flatLessons.length > 0) {
        target = flatLessons[0];
      }

      if (target) {
        const lRes = await api.getLesson(target.id);
        setCurrentLesson(lRes.lesson);
      }
    } catch (err) {
      console.error("Error loading course player:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseAndLesson(initialLessonId);
  }, [courseId, initialLessonId]);

  const handleSelectLesson = async (lessonId) => {
    try {
      setAiTool(null);
      setAiAnswer("");
      setAiSummary("");
      setAiFlashcards([]);
      const lRes = await api.getLesson(lessonId);
      setCurrentLesson(lRes.lesson);
    } catch (err) {
      alert("Could not load lesson.");
    }
  };

  const handleToggleComplete = async () => {
    if (!currentLesson) return;
    try {
      setMarking(true);
      await api.completeLesson(courseId, currentLesson.id);
      // Reload course details to update progress
      const res = await api.getCourseDetail(courseId);
      setCourse(res.course);
      setCurrentLesson((prev) => ({ ...prev, is_completed: true }));
    } catch (err) {
      alert("Failed to update lesson completion.");
    } finally {
      setMarking(false);
    }
  };

  // Lesson AI tools
  const handleAskLessonAI = async () => {
    if (!aiQuestion.trim() || !currentLesson) return;
    try {
      setAiLoading(true);
      const res = await api.askQuestion(aiQuestion, courseId, currentLesson.id);
      setAiAnswer(res.answer);
    } catch (err) {
      setAiAnswer("Could not fetch answer: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSummarizeLesson = async () => {
    if (!currentLesson) return;
    try {
      setAiLoading(true);
      setAiTool("summary");
      const res = await api.generateSummary(courseId, currentLesson.id);
      setAiSummary(res.summary);
    } catch (err) {
      setAiSummary("Could not generate summary.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFlashcardsLesson = async () => {
    if (!currentLesson) return;
    try {
      setAiLoading(true);
      setAiTool("flashcards");
      const res = await api.generateFlashcards(courseId, currentLesson.id);
      setAiFlashcards(res.flashcards || []);
    } catch (err) {
      setAiFlashcards([]);
    } finally {
      setAiLoading(false);
    }
  };

  // Find next and prev lessons
  const flatLessons = [];
  course?.modules?.forEach((m) => {
    m.lessons?.forEach((l) => flatLessons.push(l));
  });
  const currentIndex = flatLessons.findIndex((l) => l.id === currentLesson?.id);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading classroom content...</p>
      </div>
    );
  }

  return (
    <div className="classroom-player-wrapper">
      {/* Top Bar Navigation */}
      <div className="player-topbar">
        <button className="secondary-button-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Courses
        </button>

        <div className="player-title-info">
          <span className="course-breadcrumb-text">{course?.title}</span>
          <span className="player-progress-text">
            Progress: {course?.progress_percent || 0}% ({course?.completed_lessons || 0}/{course?.total_lessons || 0})
          </span>
        </div>

        <div className="player-topbar-actions">
          {currentLesson && (
            <button
              className={`completion-toggle-btn ${currentLesson.is_completed ? "completed" : ""}`}
              onClick={handleToggleComplete}
              disabled={marking}
            >
              <CheckCircle2 size={16} />
              {currentLesson.is_completed ? "Completed" : "Mark as Completed"}
            </button>
          )}
        </div>
      </div>

      <div className="classroom-main-grid">
        {/* Left Column: Syllabus Tree */}
        <aside className="classroom-syllabus-sidebar">
          <div className="syllabus-sidebar-header">
            <h3>Course Curriculum</h3>
            <span>{flatLessons.length} Total Lessons</span>
          </div>

          <div className="syllabus-modules-scroll">
            {course?.modules?.map((mod, mIdx) => (
              <div key={mod.id} className="player-module-group">
                <div className="player-mod-header">
                  <span>M{mIdx + 1}:</span> {mod.title}
                </div>
                <div className="player-lessons-stack">
                  {mod.lessons?.map((les) => {
                    const isActive = les.id === currentLesson?.id;
                    return (
                      <button
                        key={les.id}
                        className={`player-lesson-link ${isActive ? "active" : ""}`}
                        onClick={() => handleSelectLesson(les.id)}
                      >
                        <span className={`status-dot ${les.is_completed ? "completed" : ""}`}>
                          {les.is_completed ? "✓" : "○"}
                        </span>
                        <span className="lesson-name">{les.title}</span>
                        <span className="lesson-time">{les.duration_minutes || 15}m</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Column: Active Lesson View & Materials */}
        <section className="classroom-content-panel">
          {currentLesson ? (
            <>
              <div className="lesson-content-header">
                <div>
                  <div className="eyebrow">
                    <Clock size={13} /> {currentLesson.duration_minutes || 15} MINUTES ESTIMATED
                  </div>
                  <h2>{currentLesson.title}</h2>
                </div>
              </div>

              {/* Lesson Text Content */}
              <div className="lesson-notes-card">
                <h3>Lesson Overview & Study Notes</h3>
                <p className="lesson-body-text">{currentLesson.content || "No textual description provided for this lesson."}</p>
              </div>

              {/* Uploaded Materials & PDF Note Ingestion Pipeline */}
              <div className="lesson-materials-card">
                <div className="materials-header">
                  <div className="eyebrow">
                    <FileText size={13} /> ATTACHED STUDY DOCUMENTS & FAISS VECTORS
                  </div>
                  <h3>Learning Materials ({currentLesson.materials?.length || 0})</h3>
                </div>

                {currentLesson.materials?.length === 0 ? (
                  <div className="materials-empty-notice">
                    <p>No PDF notes currently uploaded for this lesson.</p>
                  </div>
                ) : (
                  <div className="materials-file-list">
                    {currentLesson.materials.map((mat) => (
                      <div key={mat.id} className="material-item-card">
                        <div className="mat-icon-wrap">
                          <FileText size={20} />
                        </div>
                        <div className="mat-details">
                          <strong>{mat.original_name || mat.filename}</strong>
                          <div className="mat-sub-info">
                            <span>📄 {mat.pages_count} pages</span>
                            <span>•</span>
                            <span>🧩 {mat.chunks_count} FAISS chunks indexed</span>
                            <span>•</span>
                            <span>{(mat.file_size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>

                        <a
                          href={`${API_URL}/files/${mat.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="download-file-btn"
                          title="Open or Download PDF"
                        >
                          <Download size={15} /> Open PDF
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contextual Lesson AI Assistant */}
              <div className="lesson-ai-assistant-card">
                <div className="ai-assist-header">
                  <div className="ai-assist-title">
                    <Sparkles size={18} />
                    <h3>NoteSense Contextual Study Assistant</h3>
                  </div>
                  <span className="lesson-scope-badge">
                    Scoped to Lesson: {currentLesson.title.substring(0, 30)}...
                  </span>
                </div>
                <p className="ai-assist-desc">
                  Run semantic search, generate concise summaries, or produce interactive flashcards 
                  strictly sourced from this lesson's indexed study documents.
                </p>

                <div className="ai-tools-btn-row">
                  <button
                    className={`ai-chip-btn ${aiTool === "ask" ? "active" : ""}`}
                    onClick={() => setAiTool("ask")}
                  >
                    <MessageSquare size={15} /> Ask AI
                  </button>
                  <button
                    className={`ai-chip-btn ${aiTool === "summary" ? "active" : ""}`}
                    onClick={handleSummarizeLesson}
                    disabled={aiLoading}
                  >
                    <Brain size={15} /> Summarize Lesson Notes
                  </button>
                  <button
                    className={`ai-chip-btn ${aiTool === "flashcards" ? "active" : ""}`}
                    onClick={handleFlashcardsLesson}
                    disabled={aiLoading}
                  >
                    <Layers size={15} /> Lesson Flashcards
                  </button>
                </div>

                {/* AI Tool Sub-panels */}
                {aiTool === "ask" && (
                  <div className="lesson-ai-tool-panel">
                    <div className="chat-input lesson-chat-input">
                      <input
                        type="text"
                        placeholder="Ask a question about this lesson's notes..."
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAskLessonAI()}
                      />
                      <button onClick={handleAskLessonAI} disabled={aiLoading}>
                        <Send size={16} />
                      </button>
                    </div>

                    {aiLoading && <div className="ai-loading-pill">Querying FAISS and Gemini...</div>}

                    {aiAnswer && (
                      <div className="chat-message assistant-message lesson-answer-box">
                        <div className="message-icon"><Sparkles size={16} /></div>
                        <div>
                          <strong>NoteSense AI (Grounded in Lesson Notes)</strong>
                          <p>{aiAnswer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {aiTool === "summary" && (
                  <div className="lesson-ai-tool-panel">
                    {aiLoading ? (
                      <div className="ai-loading-pill">Synthesizing lesson summary...</div>
                    ) : (
                      <div className="result-card">
                        <h4>AI Summary of Lesson Notes:</h4>
                        <p style={{ whiteSpace: "pre-line" }}>{aiSummary}</p>
                      </div>
                    )}
                  </div>
                )}

                {aiTool === "flashcards" && (
                  <div className="lesson-ai-tool-panel">
                    {aiLoading ? (
                      <div className="ai-loading-pill">Generating active recall flashcards...</div>
                    ) : aiFlashcards.length === 0 ? (
                      <p>No flashcards could be generated from available notes.</p>
                    ) : (
                      <div className="lesson-flashcards-grid">
                        {aiFlashcards.map((card, idx) => (
                          <div key={idx} className="lesson-mini-flashcard">
                            <span className="card-q-tag">Q{idx + 1}: {card.question}</span>
                            <p className="card-a-text"><strong>A:</strong> {card.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Nav Prev / Next */}
              <div className="classroom-bottom-nav">
                {prevLesson ? (
                  <button className="secondary-button" onClick={() => handleSelectLesson(prevLesson.id)}>
                    <ChevronLeft size={16} /> Previous: {prevLesson.title.substring(0, 25)}...
                  </button>
                ) : <div />}

                {nextLesson && (
                  <button className="primary-button" onClick={() => handleSelectLesson(nextLesson.id)}>
                    Next: {nextLesson.title.substring(0, 25)}... <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Select a lesson from the left syllabus to start learning.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
