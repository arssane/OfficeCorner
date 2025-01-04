import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

const Dashboard = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  const handleLoginClick = () => {
    setIsLoginOpen(true);
    setIsSignUpOpen(false);
  };

  const handleSignUpClick = () => {
    setIsSignUpOpen(true);
    setIsLoginOpen(false);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
  };

  const handleCloseSignUp = () => {
    setIsSignUpOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="relative inline-block px-10 py-12 bg-white shadow-lg rounded-xl overflow-hidden border-8 border-cyan-600">
        <div className="text-center space-y-6 font-agu">
          <h1 className="text-6xl font-bold text-cyan-700 font-agu">
            OfficeCorner
          </h1>
          {/* Inspirational Quote */}
          <p className="text-xl text-gray-700 italic mt-4 font-lobster">
            "The only way to do great work is to love what you do." – Steve Jobs
          </p>
          <div className="space-x-4 mt-6">
            <button
              onClick={handleLoginClick}
              className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-cyan-900"
            >
              Login
            </button>
            <button
              onClick={handleSignUpClick}
              className="px-6 py-2 bg-green-700 text-white rounded hover:bg-cyan-900"
            >
              Sign Up
            </button>
          </div>
        </div>
        {isLoginOpen && <LoginForm onClose={handleCloseLogin} />}
        {isSignUpOpen && <SignupForm onClose={handleCloseSignUp} />}
      </div>
    </div>
  );
};

export default Dashboard;
