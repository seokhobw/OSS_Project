import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyQuizzes.css";

const MyQuizzes = () => {
  const navigate = useNavigate();

  const API_URL = "https://69423e10686bc3ca8169004a.mockapi.io/Questions";

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ 수정 모달
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("easy");
  const [editTagsText, setEditTagsText] = useState("");

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // ✅ 삭제(D)
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);

      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      // 편집 중이던 대상이 삭제되면 모달도 닫기
      if (editingQuiz?.id === id) setEditingQuiz(null);
    } catch (err) {
      console.error(err);
      alert("삭제 실패");
    }
  };

  // ✅ 퀴즈 즐겨찾기 토글(Update) — CORS 때문에 PUT 사용
  const toggleQuizFavorite = async (quiz, e) => {
    e.stopPropagation();

    const nextFavorite = !quiz.isFavorite;
    const updatedQuiz = { ...quiz, isFavorite: nextFavorite };

    try {
      const res = await fetch(`${API_URL}/${quiz.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedQuiz),
      });
      if (!res.ok) throw new Error(`PUT failed: ${res.status}`);

      setQuizzes((prev) =>
        prev.map((q) => (q.id === quiz.id ? updatedQuiz : q))
      );

      // 모달이 열려있는 퀴즈면 모달 상태도 동기화
      if (editingQuiz?.id === quiz.id) {
        setEditingQuiz(updatedQuiz);
      }
    } catch (err) {
      console.error(err);
      alert("즐겨찾기 변경 실패");
    }
  };

  // ✅ 수정 모달 열기
  const openEditModal = (quiz, e) => {
    e.stopPropagation();
    setEditingQuiz(quiz);
    setEditTitle(quiz.title || "");
    setEditDifficulty(quiz.difficulty || "easy");
    setEditTagsText((quiz.tags || []).join(", "));
  };

  // ✅ 수정 저장(Update) — CORS 때문에 PUT 사용
  const saveEdit = async () => {
    if (!editingQuiz) return;

    const title = editTitle.trim();
    if (!title) {
      alert("제목은 비워둘 수 없습니다.");
      return;
    }

    const tags = editTagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const updatedQuiz = {
      ...editingQuiz,
      title,
      difficulty: editDifficulty,
      tags,
    };

    try {
      const res = await fetch(`${API_URL}/${editingQuiz.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedQuiz),
      });
      if (!res.ok) throw new Error(`PUT failed: ${res.status}`);

      setQuizzes((prev) =>
        prev.map((q) => (q.id === editingQuiz.id ? updatedQuiz : q))
      );
      setEditingQuiz(null);
    } catch (err) {
      console.error(err);
      alert("수정 저장 실패");
    }
  };

  const filteredQuizzes = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return quizzes;

    return quizzes.filter((q) => {
      const titleMatch = (q.title || "").toLowerCase().includes(t);
      const tagMatch = q.tags?.some((tag) =>
        String(tag).toLowerCase().includes(t)
      );
      return titleMatch || tagMatch;
    });
  }, [quizzes, searchTerm]);

  if (loading) return <div>로딩 중...</div>;

  return (
    <div className="myquizzes-container">
      <div className="myquizzes-header">
        <h2 style={{ margin: 0 }}>My Quizzes</h2>

        <div className="myquizzes-actions">
          <button onClick={fetchQuizzes}>🔄 Reload</button>
          <button
            onClick={() => setIsEditMode((v) => !v)}
            className={isEditMode ? "danger-toggle" : "green-toggle"}
          >
            {isEditMode ? "편집 완료" : "Edit 모드"}
          </button>
        </div>
      </div>

      <input
        className="search-input"
        type="text"
        placeholder="제목 또는 태그 검색..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="quiz-grid">
        {filteredQuizzes.map((quiz) => (
          <div
            key={quiz.id}
            className={`quiz-card ${isEditMode ? "edit-mode" : ""}`}
            onClick={() => !isEditMode && navigate(`/quizzes/${quiz.id}`)}
          >
            <div className="quiz-card-top">
              {/* ⭐ 즐겨찾기 */}
              <button
                className="favorite-btn"
                onClick={(e) => toggleQuizFavorite(quiz, e)}
                title="즐겨찾기"
              >
                {quiz.isFavorite ? "★" : "☆"}
              </button>

              {/* 우측 컨트롤들 */}
              {isEditMode ? (
                <div className="card-controls">
                  <button
                    className="edit-btn"
                    onClick={(e) => openEditModal(quiz, e)}
                  >
                    수정
                  </button>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(quiz.id, e)}
                  >
                    삭제
                  </button>
                </div>
              ) : (
                <div />
              )}
            </div>

            <div className="quiz-content">
              <h3 className="quiz-title">{quiz.title}</h3>
              <p className="quiz-meta">
                주제: {quiz.topic} | 난이도: {quiz.difficulty}
              </p>

              <div className="tag-list">
                {quiz.tags?.map((tag) => (
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ 수정 모달 */}
      {editingQuiz && (
        <div className="modal-overlay" onClick={() => setEditingQuiz(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>퀴즈 수정</h3>

            <div className="modal-group">
              <div className="modal-label">제목</div>
              <input
                className="modal-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className="modal-group">
              <div className="modal-label">난이도</div>
              <select
                className="modal-select"
                value={editDifficulty}
                onChange={(e) => setEditDifficulty(e.target.value)}
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </div>

            <div className="modal-group">
              <div className="modal-label">태그 (쉼표로 구분)</div>
              <input
                className="modal-input"
                value={editTagsText}
                onChange={(e) => setEditTagsText(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setEditingQuiz(null)}>
                취소
              </button>
              <button className="save-btn" onClick={saveEdit}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyQuizzes;
