import os
from typing import Optional, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from openai import OpenAI
from dotenv import load_dotenv


# ============================================
# 0. Upstage 클라이언트 설정
# ============================================

load_dotenv()  # .env 파일 읽어오기

API_KEY = os.getenv("UPSTAGE_API_KEY")
if not API_KEY:
    raise RuntimeError(".env 에 UPSTAGE_API_KEY가 설정되지 않았습니다.")

client = OpenAI(
    api_key=API_KEY,
    base_url="https://api.upstage.ai/v1",  # Upstage 엔드포인트
)

MODEL_NAME = "solar-pro2"


# ============================================
# 1. FastAPI 앱 / CORS 설정
# ============================================

app = FastAPI(title="Upstage Quiz Backend")

# 🔥 로컬 개발 편하게 하려고 CORS 전부 허용 (데모용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 모든 Origin 허용
    allow_credentials=False,  # "*"와 같이 쓸 때는 False
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# 2. 요청/응답 스키마
# ============================================

class GenerateRequest(BaseModel):
    text: str
    # summary / quiz / assignments / all
    mode: Literal["summary", "quiz", "assignments", "all"] = "all"


class GenerateResponse(BaseModel):
    summary: Optional[str] = None
    quiz: Optional[str] = None
    assignments: Optional[str] = None


# ============================================
# 3. Upstage 호출 공통 함수
# ============================================

def call_solar(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> str:
    """
    Upstage Solar Pro2에 한 번 호출하는 공통 함수.
    """
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        print("[Upstage 호출 에러]", e)
        raise


# ============================================
# 4. summary / quiz / assignments 프롬프트 함수
# ============================================

def generate_summary(text: str) -> str:
    system_prompt = (
        "당신은 대학 강의 자료를 이해하기 쉽게 요약해주는 조교입니다. "
        "너무 어려운 용어는 간단히 풀어서 설명해 주세요."
    )

    user_prompt = f"""
다음은 강의/수업 자료의 텍스트입니다.
대학생 기준으로 핵심 내용을 5~7문장 정도로 한국어로 요약해 주세요.

- 핵심 개념 위주로 정리
- 불필요한 예시는 줄이고, 중요한 개념은 한두 문장으로 풀어서 설명

=== 원문 시작 ===
{text}
=== 원문 끝 ===
"""

    return call_solar(system_prompt, user_prompt, temperature=0.3, max_tokens=1024)


def generate_quiz(text: str) -> str:
    system_prompt = (
        "당신은 대학 강의를 위한 시험 문제를 출제하는 조교입니다. "
        "학생의 이해도를 평가할 수 있는 깔끔한 문제를 만들어 주세요."
    )

    user_prompt = f"""
다음 강의 내용을 바탕으로 퀴즈를 만들어 주세요.

[요청 사항]
1. 객관식 3문제
   - 각 문제마다 보기 4개 (1) (2) (3) (4)
   - 정답 번호와 한 줄짜리 해설 포함
2. 단답형 2문제
   - 한두 줄로 답할 수 있는 질문
   - 모범 답안 한 줄 포함
3. 출력 형식은 아래 예시처럼 한국어로 작성해 주세요.

[출력 예시 형식]

[객관식 1]
Q. 질문 내용...
(1) 보기1
(2) 보기2
(3) 보기3
(4) 보기4
정답: (2)
해설: ~~~

[객관식 2]
...

[단답형 1]
Q. 질문 내용...
모범 답안: ~~~

[단답형 2]
...

=== 강의 텍스트 시작 ===
{text}
=== 강의 텍스트 끝 ===
"""

    return call_solar(system_prompt, user_prompt, temperature=0.5, max_tokens=2048)


def generate_assignments(text: str) -> str:
    system_prompt = (
        "당신은 대학 강의용 과제/프로젝트를 설계하는 교육 조교입니다. "
        "현실적인 난이도의 과제를 제안해 주세요."
    )

    user_prompt = f"""
아래 수업 내용을 바탕으로, 대학생이 1~2주 안에 수행할 수 있는 과제/프로젝트 아이디어를 2개 제안해 주세요.

[조건]
- 각 과제는 아래 형식을 지켜 주세요.
  1) 과제 제목
  2) 과제 목표 (2~3줄)
  3) 수행 내용 (3~5줄, 구체적 활동)
  4) 평가 포인트 (2~3줄, 무엇을 기준으로 평가할지)

=== 수업 텍스트 시작 ===
{text}
=== 수업 텍스트 끝 ===
"""

    return call_solar(system_prompt, user_prompt, temperature=0.6, max_tokens=2048)


# ============================================
# 5. 메인 엔드포인트: /api/generate
# ============================================

@app.post("/api/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    """
    프론트에서 텍스트만 보내면,
    요약 / 퀴즈 / 과제 아이디어를 만들어서 돌려주는 엔드포인트.
    """
    if not req.text or req.text.strip() == "":
        raise HTTPException(status_code=400, detail="text가 비어 있습니다.")

    # 너무 길면 잘라주기 (토큰 폭주 방지)
    MAX_CHARS = 15000
    text = req.text
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS]

    summary = quiz = assignments = None

    try:
        if req.mode in ("summary", "all"):
            summary = generate_summary(text)

        if req.mode in ("quiz", "all"):
            quiz = generate_quiz(text)

        if req.mode in ("assignments", "all"):
            assignments = generate_assignments(text)

    except Exception as e:
        print("[/api/generate 에러]", e)
        raise HTTPException(status_code=500, detail="Upstage 호출 중 오류가 발생했습니다.")

    return GenerateResponse(
        summary=summary,
        quiz=quiz,
        assignments=assignments,
    )


# ============================================
# 6. 헬스 체크
# ============================================

@app.get("/health")
def health_check():
    return {"status": "ok"}