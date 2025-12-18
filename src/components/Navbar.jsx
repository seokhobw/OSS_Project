import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // 스타일은 아래 3번 참고

const Navbar = () => {
  return (
    <nav className="side-navbar">
      <div className="nav-logo">AI Quiz Studio</div>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/quizzes">My Quizzes</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;