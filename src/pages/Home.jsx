import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyQuizzes.css"; // 모달 스타일 재사용 (없으면 지워도 됨)

import * as pdfjsLib from "pdfjs-dist/build/pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const Home = () => {
  const navigate = useNavigate();

  // 모달 open
  const [open, setOpen] = useState(false);

  // 입력값
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [tagsText, setTagsText] = useState("");

  // PDF
  const [pdfFile, setPdfFile] = useState(null);

  // 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // (선택) 추출 텍스트 미리보기/디버그용
  const [previewText, setPreviewText] = useState("");

  const tags = useMemo(() => {
    return tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tagsText]);

  const resetModal = () => {
    setTitle("");
    setDifficulty("easy");
    setTagsText("");
    setPdfFile(null);
    setLoading(false);
    setError("");
    setPreviewText("");
  };

  const closeModal = () => {
    setOpen(false);
    resetModal();
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0] || null;
    setPdfFile(file);
    setError("");
    setPreviewText("");
  };

  // ✅ 프론트에서 PDF → 텍스트 추출 (여기가 핵심)
  const extractPdfText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str);
      fullText += strings.join(" ") + "\n\n";
    }
    return fullText.trim();
  };

  // ✅ 생성 시작 버튼 (서버 호출 전에 반드시 텍스트 추출 await)
  const handleGenerate = async () => {
    setError("");

    if (!title.trim()) {
      setError("퀴즈 이름(제목)을 입력해 주세요.");
      return;
    }
    if (!pdfFile) {
      setError("PDF 파일을 업로드해 주세요.");
      return;
    }

    setLoading(true);

    try {
      // 1) PDF -> 텍스트 먼저!
      const text = await extractPdfText(pdfFile);

      // 디버깅/미리보기 (너무 길면 앞부분만)
      setPreviewText(text.slice(0, 1500));

      // text가 비면 서버에서 400 뜸 (네가 겪은 문제)
      if (!text || !text.trim()) {
        throw new Error(
          "PDF에서 텍스트를 추출하지 못했습니다. (스캔본 PDF면 텍스트가 없을 수 있어요)"
        );
      }

      // 2) 서버리스 호출
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text, // ✅ 반드시 여기로 추출된 text가 들어감
          meta: {
            title: title.trim(),
            difficulty,
            tags,
          },
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.detail || `요청 실패 (HTTP ${res.status})`);
      }

      // 3) 업로드 결과에서 첫 saved id 찾기 (있으면 디테일로 이동)
      const firstSavedId =
        payload?.uploaded?.find((x) => x?.ok && x?.saved?.id)?.saved?.id || null;

      setOpen(false);
      resetModal();

      if (firstSavedId) {
        navigate(`/quizzes/${firstSavedId}`);
      } else {
        navigate("/my-quizzes");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>나만의 AI 퀴즈 스튜디오</h1>
      <p>LLM으로 만드는 맞춤형 학습 서비스</p>

      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "15px 30px",
          fontSize: "18px",
          cursor: "pointer",
          backgroundColor: "#58cc02",
          color: "white",
          border: "none",
          borderRadius: "10px",
        }}
      >
        퀴즈 생성하기
      </button>

      {/* 모달 */}
      {open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>퀴즈 생성 설정</h3>
            <p style={{ marginTop: -6, fontSize: 13, opacity: 0.7 }}>
              이름/난이도/태그를 정하고 PDF를 업로드하면 자동으로 퀴즈를 생성해 저장합니다.
            </p>

            <div className="modal-group">
              <div className="modal-label">퀴즈 이름</div>
              <input
                className="modal-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예) 이산수학 기말 대비"
              />
            </div>

            <div className="modal-group">
              <div className="modal-label">난이도</div>
              <select
                className="modal-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </div>

            <div className="modal-group">
              <div className="modal-label">태그(쉼표로 구분)</div>
              <input
                className="modal-input"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="예) 그래프, 확률, 중간고사"
              />
            </div>

            <div className="modal-group">
              <div className="modal-label">PDF 업로드</div>
              <input type="file" accept="application/pdf" onChange={onPickFile} />
              {pdfFile && (
                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                  📄 {pdfFile.name}
                </div>
              )}
            </div>

            {/* (선택) 텍스트 추출 확인용 */}
            {previewText && (
              <div className="modal-group" style={{ textAlign: "left" }}>
                <div className="modal-label">추출 텍스트(미리보기)</div>
                <textarea
                  className="modal-input"
                  style={{ height: 110 }}
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                />
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                  ※ 미리보기는 앞부분만 표시됩니다.
                </div>
              </div>
            )}

            {error && (
              <div style={{ color: "crimson", marginTop: 10, fontSize: 14 }}>
                ⚠ {error}
              </div>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeModal} disabled={loading}>
                취소
              </button>
              <button className="save-btn" onClick={handleGenerate} disabled={loading}>
                {loading ? "생성 중..." : "생성 시작"}
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
              * Vercel에서는 <code>/api/generate</code> 서버리스 함수와 UPSTAGE_API_KEY 환경변수가 필요합니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
