import React, { useState, useEffect } from "react";
import Login from "./LoginForm";
import SignUp from "./SignupForm";
import logo from "../assets/logo.png";
import logob from "../assets/logob.png";

const Dashboard = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Handle successful login
  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    setUsername(userData.username || "User");
    setShowLogin(false);
    setShowSuccessMessage(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
  };

  return (
    <div className="h-screen bg-green-900 text-white relative overflow-auto">
      {/* Navbar */}
      <nav className="container mx-auto flex justify-between items-center px-6 py-4 bg-white rounded-full shadow-lg mt-4 fixed top-0 left-0 right-0 z-50 w-[95%]">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Logo" className="h-10 w-10 rounded-full" />
          <h1 className="text-xl font-bold text-green-800">OfficeCorner</h1>
        </div>
        <ul className="flex gap-8">
          <li className="cursor-pointer bg-transparent text-green-800 border border-green-800 px-6 py-3 rounded-full hover:bg-green-500 hover:text-white transition"  
              onClick={() => document.getElementById('home').scrollIntoView({ behavior: 'smooth' })}>Home</li>
          <li className="cursor-pointer bg-transparent text-green-800 border border-green-800 px-6 py-3 rounded-full hover:bg-green-500 hover:text-white transition"
              onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}>About Us</li>
          <li className="cursor-pointer bg-transparent text-green-800 border border-green-800 px-6 py-3 rounded-full hover:bg-green-500 hover:text-white transition"
              onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}>Services</li>
        </ul>
        <div className="flex gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-green-800 font-medium">Welcome, {username}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition"
              >
                Logout
              </button>
              <button
                className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition"
              >
                Dashboard → 
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowLogin(true);
                  setShowSignUp(false);
                }}
                className="bg-gray-200 text-green-800 px-4 py-2 rounded-full hover:bg-gray-300 transition"
              >
                LogIn →
              </button>
              <button
                onClick={() => {
                  setShowSignUp(true);
                  setShowLogin(false);
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition"
              >
                SignUp →
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Login Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-24 right-6 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 transition-opacity animate-bounce">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium">Successfully logged in! Welcome, {username}!</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <header id="home" className="relative text-center flex flex-col justify-center items-center min-h-screen bg-cover bg-center mt-20"
        style={{
          backgroundImage: `url(${logob})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-green-900 bg-opacity-70"></div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Transform Your Office Management</h1>
          <p className="text-lg md:text-xl mb-6">
            Experience seamless and efficient office management with our cutting-edge solutions.
          </p>
          <div className="flex justify-center gap-4">
            <button className="bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 transition">
              Explore Our Solutions
            </button>
            <button className="bg-transparent text-white border border-white px-6 py-3 rounded-full hover:bg-green-500 hover:border-green-500 transition">
              Get Started →
            </button>
          </div>
        </div>
      </header>

      {/* About Us Section */}
      <section id="about" className="flex flex-col md:flex-row items-center justify-between min-h-screen bg-white text-black px-10 py-20">
        {/* Left Side: Image */}
        <div className="w-full md:w-1/2 flex justify-center">
          <img
            src={logo}
            alt="Office workspace"
            className="max-w-[80%] md:max-w-[70%] h-auto object-cover rounded-2xl shadow-lg transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Right Side: Text Content */}
        <div className="w-full md:w-1/2 p-6 text-center md:text-left">
          <h2 className="text-green-600 text-sm md:text-lg font-semibold uppercase tracking-wide">
            Streamline Your Office
          </h2>
          <h1 className="text-3xl md:text-4xl font-bold text-green-800 mb-4">
            Our Story
          </h1>
          <p className="text-gray-700 text-base md:text-lg leading-relaxed">
            At <span className="font-semibold text-green-700">OfficeCorner</span>, we are dedicated to revolutionizing the way offices operate, ensuring efficiency and professionalism in every aspect.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="bg-white py-20 px-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-green-800 mb-4 uppercase">Our Services</h1>
          <p className="text-gray-600 text-lg mt-2">
            Explore our range of services designed to enhance your office management experience.<br></br>
            Simplify Office Management with Smart Solutions
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {/* Service 1 */}
          <div className="flex items-start gap-4">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <span className="text-2xl">💻</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Workforce Management</h3>
              <p className="text-gray-600">Automate attendance, payroll, and employee records seamlessly.</p>
            </div>
          </div>

          {/* Service 2 */}
          <div className="flex items-start gap-4">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Collaboration & Communication</h3>
              <p className="text-gray-600">Enhance teamwork with real-time chat and task tracking.</p>
            </div>
          </div>

          {/* Service 3 */}
          <div className="flex items-start gap-4">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <span className="text-2xl">🧩</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900"> Productivity & Planning </h3>
              <p className="text-gray-600">Streamline schedules, meetings, and project timelines.</p>
            </div>
          </div>

          {/* Service 4 */}
          <div className="flex items-start gap-4">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Security & Compliance</h3>
              <p className="text-gray-600">Ensure data protection and regulatory compliance with robust controls.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      {showLogin && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-center z-20">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg relative w-[90%] max-w-md">
            <Login onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}

      {showSignUp && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-center z-20">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg relative w-[90%] max-w-md">
            <SignUp onClose={() => setShowSignUp(false)} />
          </div>
        </div>
      )}

      {/* Disable interactions when modal is open */}
      {(showLogin || showSignUp) && <div className="fixed inset-0 bg-black bg-opacity-50 z-10"></div>}
    </div>
  );
};

export default Dashboard;