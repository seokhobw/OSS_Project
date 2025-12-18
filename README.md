# 📚 AI Quiz Generator

PDF/TXT 문서를 기반으로 LLM이 자동으로 객관식 문제를 생성하고,
React UI를 통해 사용자에게 퀴즈 형태로 제공하는 웹 서비스

---

src/
├── api/              # Upstage LLM 및 MockAPI 호출 관련 로직 [cite: 67, 28]
├── components/       # 여러 페이지에서 공통으로 쓰이는 UI 컴포넌트 (버튼, 카드 등) [cite: 62, 64]
├── pages/            # 라우터에 연결될 주요 페이지 단위 
│   ├── Home/         # Home 페이지 [cite: 86]
│   ├── Generator/    # Quiz Generator 페이지 [cite: 88]
│   ├── MyQuizzes/    # My Quizzes (목록/CRUD) 페이지 [cite: 90]
│   └── QuizDetail/   # Quiz Detail (문제 풀이) 페이지 [cite: 91]
├── hooks/            # 커스텀 훅 (예: PDF 텍스트 변환 로직 등) [cite: 55, 78]
├── styles/           # 전역 스타일 및 공통 CSS 변수 [cite: 58]
├── utils/            # 날짜 포맷팅, 데이터 가공 등 유틸리티 함수
├── App.js            # React Router 설정 [cite: 57, 125]
└── index.js          # 진입점

---

## 🚀 목표

| 기능           | 목표                           |
| ------------ | ---------------------------- |
| 파일 기반 콘텐츠 처리 | 사용자가 업로드한 PDF/TXT 내용을 분석     |
| LLM 퀴즈 생성    | 텍스트 기반 객관식 문제 JSON 자동 생성     |
| UI 제공        | React에서 선택형 문제를 풀 수 있는 UI 제공 |
| 배포           | Vercel 기반 배포 및 무DB 서비스 구현    |

---

## 🏗 기술 스택

| Category             | Stack                                    |
| -------------------- | ---------------------------------------- |
| Frontend             | React / Vite or CRA / Tailwind(Optional) |
| Backend (Serverless) | **Vercel Functions (Node.js)**           |
| AI Engine            | OpenAI Responses API (`gpt-4.1-mini`)    |
| Deployment           | Vercel                                   |
| DB                   | ❌ 없음 (상태 → 클라이언트 로컬 유지)                  |

---

## 📌 서비스 동작 흐름

```
사용자 → PDF/TXT 업로드
            ↓ (텍스트 추출)
React → /api/generate-questions → LLM 요청
            ↓ (JSON 문제 데이터)
프론트 UI에서 카드 형태로 퀴즈 표시
```

---

## 🔥 전체 기능 Plan

### 1. MVP 기능 (최소 기능 버전)

| 기능          | 상세                           | 상태    |
| ----------- | ---------------------------- | ----- |
| TXT/PDF 업로드 | FileReader + pdf.js로 텍스트 추출  | 🟡 예정 |
| 문제 자동 생성    | LLM에게 JSON 형태로 문제 5개 생성 요청   | 🟡 예정 |
| UI 출력       | QuestionCard 컴포넌트로 문제/선택지 표시 | 🟡 예정 |
| 배포          | Vercel Deploy                | 🟡 예정 |

---

### 2. 확장 기능(선택적 발전)

| 기능            | 설명                       |
| ------------- | ------------------------ |
| 난이도 옵션 선택     | Easy/Medium/Hard 프롬프트 반영 |
| 문제 수 설정       | 5 → 10/20 증가 가능          |
| 시험 모드 / 학습 모드 | 채점 & 정답 숨기기 기능           |
| 텍스트 일부만 선택 학습 | PDF 페이지 범위 입력            |
| UI 스타일 업그레이드  | Tailwind + 애니메이션 + 다크모드  |

---

## 📁 프로젝트 구조 (예정)

```bash
📦 project-root
├─ src/
│  ├─ App.jsx            # UI 메인
│  ├─ components/        # QuestionCard, Upload 등 UI 컴포넌트
│  └─ api/llm.js         # LLM 직접 호출 버전(선택)
│
├─ api/
│  └─ generate-questions.js   # Vercel Serverless 함수(API)
│
├─ vercel.json           # 함수 설정 (Node 18 런타임)
├─ README.md             # 📍 현재 문서
└─ .env.local            # OPENAI_API_KEY (노출 금지)
```

---

## 🔑 환경 변수

Vercel → 프로젝트 Settings → Environment Variables

| KEY              | VALUE         |
| ---------------- | ------------- |
| `OPENAI_API_KEY` | `sk-xxxx....` |

> React 클라이언트에서 직접 호출 ❌
> API Key는 **서버리스 함수에서만 사용**

---

## 🧠 LLM 요청 포맷

```txt
다음 텍스트를 기반으로 객관식 문제 5개를 JSON으로 생성하라.

형식:
[
  {"question": "...", "options": [...], "answerIndex": n, "explanation": "..."}
]

텍스트:
{본문}
```

---

## 🖥 로컬 실행 가이드

```bash
npm install
npm run dev
```

배포:

```bash
vercel --prod
```

---

## 📌 목표 결과물 UI 예시

```
Q1. 이 문서의 핵심 키워드는?
[A] ~~~   [B] ~~~   [C] ~~~   [D] ~~~

선택 → 정답 및 해설 표시
```

| ⬇ 예상 UI            |
| ------------------ |
| 사용자가 문제 클릭 → 정답 표시 |
| JSON 기반 카드 리스트 렌더링 |
| 문제 수 늘려도 구성 유지     |

---

## 📍 결론

| 항목      | 선택                     |
| ------- | ---------------------- |
| 배포      | Vercel                 |
| API 방식  | Serverless Function 1개 |
| DB 필요?  | ❌ 없음                   |
| 구현 우선순위 | 텍스트 파싱 → LLM → UI → 확장 |

> 목표: **문서 → 학습 문제 자동 생성**
> 서비스형 프로젝트로 발전 가능성 충분 🚀

---
