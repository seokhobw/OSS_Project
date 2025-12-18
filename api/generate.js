// api/generate.js
// POST /api/generate
// body: { text, meta: { title, difficulty, tags } }
// return: { quizzes, uploaded }

const MOCKAPI_URL =
  process.env.MOCKAPI_URL ||
  "https://69423e10686bc3ca8169004a.mockapi.io/Questions";

function isoNow() {
  return new Date().toISOString();
}

function extractJsonCandidate(s) {
  const text = String(s || "").trim();
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const fenced2 = text.match(/```\s*([\s\S]*?)\s*```/);
  if (fenced2?.[1]) return fenced2[1].trim();
  return text;
}

function safeParseJsonArray(maybeJson) {
  const raw = extractJsonCandidate(maybeJson);

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.quizzes)) return parsed.quizzes;
  } catch {}

  const first = raw.indexOf("[");
  const last = raw.lastIndexOf("]");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = raw.slice(first, last + 1);
    try {
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return null;
}

function normalizeQuizArray(arr, meta = {}) {
  const now = isoNow();
  const title = String(meta?.title || "").trim();
  const difficulty = String(meta?.difficulty || "").trim() || "medium";
  const tags = Array.isArray(meta?.tags) ? meta.tags.map(String) : [];

  return (arr || []).map((qz, idx) => {
    const quizId = String(qz?.id ?? idx + 1);

    const qTitle = String(qz?.title ?? title ?? `퀴즈 ${idx + 1}`);
    const topic = String(qz?.topic ?? "General");
    const qDifficulty = String(qz?.difficulty ?? difficulty);
    const createdAt = String(qz?.createdAt ?? now);
    const qTags = Array.isArray(qz?.tags) ? qz.tags.map(String) : tags;
    const isFavorite = Boolean(qz?.isFavorite ?? false);

    const questions = Array.isArray(qz?.questions) ? qz.questions : [];
    const normalizedQuestions = questions.map((qq, qidx) => {
      const qid = Number.isFinite(qq?.id) ? qq.id : qidx + 1;
      const text = String(qq?.text ?? "");
      const options = Array.isArray(qq?.options) ? qq.options.map(String) : [];
      const answer = String(qq?.answer ?? "");
      const explanation = String(qq?.explanation ?? "");
      return { id: qid, text, options, answer, explanation };
    });

    return {
      id: quizId,
      title: qTitle,
      topic,
      difficulty: qDifficulty,
      createdAt,
      tags: qTags,
      isFavorite,
      questions: normalizedQuestions,
    };
  });
}

function buildPrompt(text, meta) {
  const title = String(meta?.title || "").trim();
  const difficulty = String(meta?.difficulty || "").trim() || "medium";
  const tags = Array.isArray(meta?.tags) ? meta.tags : [];

  return `
너는 퀴즈 제작기야.
아래 텍스트를 바탕으로 "반드시" JSON만 출력해.

[출력 규칙]
- 출력은 JSON "배열" 하나만 출력 (추가 설명/문장/코드블록 금지)
- questions는 최소 5문항
- options는 객관식 4개
- answer는 options 중 하나의 값과 정확히 일치
- explanation은 한두 문장
- difficulty는 easy|medium|hard 중 하나

[메타 반영]
- title: ${title || "적절히 생성"}
- difficulty: ${difficulty}
- tags: ${tags.join(", ") || "없음"}

[스키마]
[
  {
    "id": "1",
    "title": "퀴즈 제목",
    "topic": "General",
    "difficulty": "easy",
    "createdAt": "2024-12-17T11:00:00Z",
    "tags": ["태그1","태그2"],
    "isFavorite": false,
    "questions": [
      {
        "id": 1,
        "text": "문제",
        "options": ["A","B","C","D"],
        "answer": "정답(보기 중 하나)",
        "explanation": "해설"
      }
    ]
  }
]

[텍스트]
${text}
`.trim();
}

async function callUpstageChat({ apiKey, prompt }) {
  const url = "https://api.upstage.ai/v1/chat/completions";

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "solar-pro",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const detail =
      data?.error?.message || data?.message || data?.detail || `Upstage API error (HTTP ${resp.status})`;
    const err = new Error(detail);
    err.status = resp.status;
    err.raw = data;
    throw err;
  }

  return data?.choices?.[0]?.message?.content ?? "";
}

async function uploadToMockAPI(quizzes) {
  const results = await Promise.all(
    quizzes.map(async (quiz) => {
      const r = await fetch(MOCKAPI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quiz),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, status: r.status, error: data, sent: quiz };
      return { ok: true, status: r.status, saved: data };
    })
  );
  return results;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  try {
    const apiKey = process.env.UPSTAGE_API_KEY;
    if (!apiKey) return res.status(500).json({ detail: "UPSTAGE_API_KEY가 없습니다." });

    const { text, meta } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ detail: "text가 비어있습니다." });

    const prompt = buildPrompt(String(text), meta);
    const content = await callUpstageChat({ apiKey, prompt });

    const parsed = safeParseJsonArray(content);
    if (!parsed) {
      return res.status(500).json({
        detail: "Upstage가 JSON 배열 생성에 실패했습니다.",
        raw: content,
      });
    }

    const quizzes = normalizeQuizArray(parsed, meta);
    const uploaded = await uploadToMockAPI(quizzes);

    return res.status(200).json({ quizzes, uploaded });
  } catch (e) {
    console.error("GENERATE_ERROR:", e);
    return res.status(e.status || 500).json({
      detail: e.message || "서버 오류",
      raw: e.raw,
    });
  }
}
