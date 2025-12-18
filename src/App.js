import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import QuizGenerator from './pages/QuizGenerator';
import MyQuizzes from './pages/MyQuizzes';
import QuizDetail from './pages/QuizDetail';

function App() {
  return (
    <Router>
      <div style={{ display: 'flex' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '20px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/generate" element={<QuizGenerator />} />
            <Route path="/quizzes" element={<MyQuizzes />} />
            <Route path="/quizzes/:id" element={<QuizDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;