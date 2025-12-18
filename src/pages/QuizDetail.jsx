import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './QuizDetail.css';

const QuizDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    fetch(`https://69423e10686bc3ca8169004a.mockapi.io/Questions/${id}`)
      .then(res => res.json())
      .then(data => {
        setQuiz(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">문제를 불러오는 중...</div>;
  if (!quiz || !quiz.questions) return <div className="error">데이터를 찾을 수 없습니다.</div>;

  const total = quiz.questions.length;

  // ✅ 종료 화면: 몇 / 몇 만 출력
  if (isFinished) {
    return (
      <div className="finish-container">
        <h2>퀴즈 종료!</h2>
        <p className="finish-score">
          {total}문제 중 {score}문제 맞혔어요
        </p>
        <button className="back-btn" onClick={() => navigate('/quizzes')}>
          목록으로
        </button>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const progress = ((currentIndex + 1) / total) * 100;
  const isLast = currentIndex === total - 1;

  const handleSubmit = () => {
    if (!selectedOption) return;

    if (selectedOption === currentQuestion.answer) {
      setScore(prev => prev + 1);
    }
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <div className="quiz-container">
      <div className="progress-bar">
        <div className="progress" style={{ width: `${progress}%` }} />
      </div>

      <div className="score">맞은 개수: {score}</div>

      <h3 className="question-number">문제 {currentIndex + 1}.</h3>
      <h2 className="question-text">{currentQuestion.text}</h2>

      <div className="options">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => !isSubmitted && setSelectedOption(option)}
            className={`option-btn ${selectedOption === option ? 'selected' : ''} ${isSubmitted ? 'disabled' : ''}`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="bottom-area">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedOption}
            className={`submit-btn ${selectedOption ? 'active' : 'disabled'}`}
          >
            정답 확인
          </button>
        ) : (
          <>
            <p className={`result-text ${selectedOption === currentQuestion.answer ? 'correct' : 'wrong'}`}>
              {selectedOption === currentQuestion.answer ? '✅ 정답입니다!' : '❌ 오답입니다.'}
            </p>
            <p className="explanation">{currentQuestion.explanation}</p>

            <button className="next-btn" onClick={handleNext}>
              {isLast ? '종료' : '다음 문제'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default QuizDetail;
