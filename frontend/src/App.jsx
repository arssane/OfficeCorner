import { useState } from 'react'
import React from 'react';
import './index.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './Components/Dashboard';
import Admindash from './Pages/Admindash'
import Employeedash from './Pages/Employeedash'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<Admindash />} />
        <Route path="/employee" element={<Employeedash />} />
      </Routes>
    </Router>
  );
}

export default App;
