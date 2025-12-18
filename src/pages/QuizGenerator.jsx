import React from 'react';

const QuizGenerator = () => {
  return (
    <div>
      <h2>Quiz Generator [cite: 24]</h2>
      <p>주제, 난이도, 문항 수를 선택하고 PDF를 업로드하세요[cite: 100, 101].</p>
      {/* 여기에 석호 님이 담당하신 파일 업로드 및 API 호출 로직이 들어갑니다[cite: 122]. */}
      <div style={{ border: '2px dashed #ccc', padding: '40px', textAlign: 'center' }}>
        파일 업로드 영역 [cite: 101]
      </div>
    </div>
  );
};

export default QuizGenerator;