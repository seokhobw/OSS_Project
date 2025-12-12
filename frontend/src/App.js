import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";


function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [mode, setMode] = useState("all");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [quiz, setQuiz] = useState("");
  const [assignments, setAssignments] = useState("");
  const [error, setError] = useState("");

  // PDF 파일 선택
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPdfFile(file || null);
    setExtractedText("");
    setSummary("");
    setQuiz("");
    setAssignments("");
    setError("");
  };

  // PDF에서 텍스트 추출
  const handleExtractText = async () => {
    if (!pdfFile) {
      alert("먼저 PDF 파일을 선택해 주세요.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setExtractedText("");

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const strings = content.items.map((item) => item.str);
        fullText += strings.join(" ") + "\n\n";
      }

      setExtractedText(fullText);
    } catch (err) {
      console.error(err);
      setError("PDF 텍스트 추출 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 백엔드 /api/generate 호출
  const handleGenerate = async () => {
    if (!extractedText.trim()) {
      alert("먼저 PDF에서 텍스트를 추출하거나, 텍스트 영역에 내용을 직접 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");
    setQuiz("");
    setAssignments("");

    try {
      const res = await fetch("http://localhost:8000/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extractedText,
          mode: mode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "요청 실패");
      }

      const data = await res.json();
      setSummary(data.summary || "");
      setQuiz(data.quiz || "");
      setAssignments(data.assignments || "");
    } catch (err) {
      console.error(err);
      setError(err.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>Upstage PDF → 요약 · 퀴즈 · 과제 생성기</h1>
          <p className="subtitle">
            수업자료 PDF를 올리면, 브라우저에서 텍스트를 뽑아서 Upstage Solar로
            요약/퀴즈/과제를 한 번에 만들어 줍니다.
          </p>
        </div>
        <span className="badge">v1 · Demo</span>
      </header>

      <main className="app-main">
        {/* 왼쪽: 업로드 + 옵션 + 원문 */}
        <section className="panel panel-left">
          <div className="card">
            <h2>1. PDF 업로드</h2>
            <p className="hint">
              강의 슬라이드 / 수업자료 PDF 파일을 선택해 주세요.
            </p>
            <div className="file-row">
              <label className="file-label">
                <span>PDF 선택</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </label>
              {pdfFile && (
                <span className="file-name">📄 {pdfFile.name}</span>
              )}
            </div>
            <button
              className="primary-btn"
              onClick={handleExtractText}
              disabled={loading || !pdfFile}
            >
              {loading ? "처리 중..." : "PDF에서 텍스트 추출"}
            </button>
          </div>

          <div className="card">
            <h2>2. 추출된 텍스트</h2>
            <p className="hint">
              필요하다면 아래 내용을 조금 고친 뒤 그대로 사용해도 됩니다.
            </p>
            <textarea
              className="text-area"
              rows={12}
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="PDF에서 추출된 텍스트가 여기에 표시됩니다."
            />
          </div>

          <div className="card">
            <h2>3. 생성 옵션</h2>
            <div className="options-row">
              <label>
                생성 모드
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="all">요약 + 퀴즈 + 과제</option>
                  <option value="summary">요약만</option>
                  <option value="quiz">퀴즈만</option>
                  <option value="assignments">과제만</option>
                </select>
              </label>
              <button
                className="primary-btn"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? "Upstage 생성 중..." : "Upstage로 생성하기"}
              </button>
            </div>

            {error && <p className="error-text">⚠ {error}</p>}
          </div>
        </section>

        {/* 오른쪽: 결과 뷰 */}
        <section className="panel panel-right">
          {summary || quiz || assignments ? null : (
            <div className="empty-state">
              <p>왼쪽에서 PDF를 업로드하고 생성 버튼을 눌러주세요.</p>
              <p className="hint">
                예: 강의 슬라이드 PDF를 올리면, 우측에 요약/퀴즈/과제가 자동 생성됩니다.
              </p>
            </div>
          )}

          {summary && (
            <div className="card result-card">
              <h2>📌 요약</h2>
              <pre className="result-pre">{summary}</pre>
            </div>
          )}

          {quiz && (
            <div className="card result-card">
              <h2>📝 퀴즈</h2>
              <pre className="result-pre">{quiz}</pre>
            </div>
          )}

          {assignments && (
            <div className="card result-card">
              <h2>🎓 과제 아이디어</h2>
              <pre className="result-pre">{assignments}</pre>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>Powered by Upstage Solar Pro2 · React · FastAPI</span>
      </footer>
    </div>
  );
}

export default App;