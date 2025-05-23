import { useState } from 'react'
import React from 'react';
import './index.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Dashboard from './Components/Dashboard';
import Admindash from './Pages/Admindash';
import Employeedash from './Pages/Employeedash';
import SignupPage from './Components/SignupForm';
import LoginPage from './Components/LoginForm';
import useNotifications from './hooks/useNotification.js';
import EmployeePendingPage from './Pages/EmployeePendingPage.jsx';

// Separate component to use the notification hook
const AppContent = () => {
  // Initialize notifications for logged-in users
  useNotifications();

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<Admindash />} />
        <Route path="/employee" element={<Employeedash />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path='/employee-pending' element={<EmployeePendingPage/>}/>
      </Routes>
      
      {/* Toast Container for notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 9999 }}
      />
    </>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;