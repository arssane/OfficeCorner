import { useState } from 'react'
import React from 'react';
import './index.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './Components/Dashboard';
import Admindash from './Pages/Admindash';
import Employeedash from './Pages/Employeedash';
import SignupPage from './Components/SignupForm';
import LoginPage from './Components/LoginForm';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<Admindash />} />
        <Route path="/employee" element={<Employeedash />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;