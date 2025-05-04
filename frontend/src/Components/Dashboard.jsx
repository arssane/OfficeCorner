import React, { useState, useEffect } from "react";
import Login from "./LoginForm";
import SignUp from "./SignupForm";
import logo from "../assets/logo.png";
import logob from "../assets/logob.png";
import { Link, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const navigate = useNavigate();

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

  // Handle successful signup
  const handleSignupSuccess = (userData) => {
    setIsLoggedIn(true);
    setUsername(userData.username || "User");
    setShowSignUp(false);
    setShowSuccessMessage(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUsername("");
  };

  // Check if user is already logged in on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setIsLoggedIn(true);
        setUsername(userData.username || "User");
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-green-900 text-white relative overflow-x-hidden">
      {/* Navbar */}
      <nav className="container mx-auto flex justify-between items-center px-6 py-4 bg-white rounded-full shadow-lg mt-4 fixed top-0 left-0 right-0 z-40 w-[95%]">
        <div className="flex items-center gap-4">
          <img src={logo} alt="OfficeCorner Logo" className="h-10 w-10 rounded-full" />
          <h1 className="text-xl font-bold text-green-800">OfficeCorner</h1>
        </div>
        
        <ul className="hidden md:flex gap-4">
          <li className="cursor-pointer bg-transparent text-green-800 border border-green-800 px-4 py-2 rounded-full hover:bg-green-500 hover:text-white transition duration-300"  
              onClick={() => document.getElementById('home').scrollIntoView({ behavior: 'smooth' })}>
            Home
          </li>
          <li className="cursor-pointer bg-transparent text-green-800 border border-green-800 px-4 py-2 rounded-full hover:bg-green-500 hover:text-white transition duration-300"
              onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}>
            About Us
          </li>
          <li className="cursor-pointer bg-transparent text-green-800 border border-green-800 px-4 py-2 rounded-full hover:bg-green-500 hover:text-white transition duration-300"
              onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}>
            Services
          </li>
        </ul>
        
        <div className="flex gap-2 md:gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-2 md:gap-3">
              <span className="hidden md:inline text-green-800 font-medium">Welcome, {username}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-2 rounded-full hover:bg-red-600 transition duration-300 text-sm md:text-base"
              >
                Logout
              </button>
              <button
                className="bg-green-600 text-white px-3 py-2 rounded-full hover:bg-green-700 transition duration-300 text-sm md:text-base"
              >
               <Link onClick={() => navigate(-1)}>Dashboard →</Link> 
              </button>
            </div>
          ) : (
            <>
             <Link to="/login">
  <button className="bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition duration-300 shadow-lg">
    Log In →
  </button>
</Link>

<button
  className="bg-green-600 text-white px-3 py-2 rounded-full hover:bg-green-700 transition duration-300 text-sm md:text-base"
>
  <Link to="/signup">Sign Up</Link>
</button>

            </>
          )}
        </div>
      </nav>

      {/* Login Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-24 right-6 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 transition-opacity">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium">Welcome back, {username}! You are now signed in.</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <header id="home" className="relative text-center flex flex-col justify-center items-center min-h-screen bg-cover bg-center pt-20"
        style={{
          backgroundImage: `url(${logob})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-green-900 bg-opacity-80"></div>
        <div className="relative z-10 px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Transform Your Office Management</h1>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            Experience seamless and efficient office management with our cutting-edge solutions.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition duration-300 shadow-lg"
            onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}>
              Explore Our Solutions
            </button>
            
            <button className="bg-transparent text-white border border-white px-6 py-3 rounded-full hover:bg-white hover:text-green-800 transition duration-300 shadow-lg">
            <Link to="/login">Get Started → </Link>
            </button>
          </div>
        </div>
      </header>

      {/* About Us Section */}
      <section id="about" className="flex flex-col md:flex-row items-center justify-between min-h-screen bg-white text-black px-6 md:px-10 py-20">
        {/* Left Side: Image */}
        <div className="w-full md:w-1/2 flex justify-center mb-10 md:mb-0">
          <img
            src={logo}
            alt="Office workspace"
            className="max-w-[80%] md:max-w-[70%] h-auto object-cover rounded-2xl shadow-lg transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Right Side: Text Content */}
        <div className="w-full md:w-1/2 p-6 text-center md:text-left">
          <h2 className="text-green-600 text-sm md:text-base font-semibold uppercase tracking-wide mb-2">
            Streamline Your Office
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold text-green-800 mb-6">
            Our Story
          </h3>
          <p className="text-gray-700 text-base md:text-lg leading-relaxed mb-6">
            At <span className="font-semibold text-green-700">OfficeCorner</span>, we are dedicated to revolutionizing the way offices operate, ensuring efficiency and professionalism in every aspect.
          </p>
          <p className="text-gray-700 text-base md:text-lg leading-relaxed">
            Our team of experts designs intuitive solutions that simplify complex workflows, enhance collaboration, and boost productivity across your organization.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="bg-white py-20 px-6">
        <div className="text-center mb-12">
          <h2 className="text-green-600 text-sm md:text-base font-semibold uppercase tracking-wide mb-2">What We Offer</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-green-800 mb-4">Our Services</h3>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Explore our comprehensive range of services designed to enhance your office management experience and boost operational efficiency.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Service 1 */}
          <div className="flex items-start gap-4 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition duration-300">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <span className="text-2xl">💻</span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Workforce Management</h4>
              <p className="text-gray-600">Automate attendance tracking, payroll processing, and employee records with our secure and intuitive platform.</p>
            </div>
          </div>

          {/* Service 2 */}
          <div className="flex items-start gap-4 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition duration-300">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Collaboration & Communication</h4>
              <p className="text-gray-600">Enhance teamwork with real-time messaging, file sharing, and integrated task tracking tools.</p>
            </div>
          </div>

          {/* Service 3 */}
          <div className="flex items-start gap-4 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition duration-300">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <span className="text-2xl">🧩</span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Productivity & Planning</h4>
              <p className="text-gray-600">Streamline schedules, manage meetings efficiently, and optimize project timelines with advanced planning tools.</p>
            </div>
          </div>

          {/* Service 4 */}
          <div className="flex items-start gap-4 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition duration-300">
            <div className="bg-green-600 text-white p-3 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Security & Compliance</h4>
              <p className="text-gray-600">Ensure data protection and maintain regulatory compliance with our robust security controls and audit features.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-800 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="OfficeCorner Logo" className="h-10 w-10 rounded-full" />
              <h3 className="text-xl font-bold">OfficeCorner</h3>
            </div>
            <p className="text-green-100 text-sm">
              Transforming office management with innovative solutions that drive efficiency and collaboration.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#home" className="text-green-100 hover:text-white transition">Home</a></li>
              <li><a href="#about" className="text-green-100 hover:text-white transition">About Us</a></li>
              <li><a href="#services" className="text-green-100 hover:text-white transition">Services</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <p className="text-green-100 mb-2">
              info@officecorner.com
            </p>
            <p className="text-green-100">
              +977 9808988184
            </p>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-green-700 text-center text-sm text-green-100">
          <p>© {new Date().getFullYear()} OfficeCorner. All rights reserved.</p>
        </div>
      </footer>

      {/* Modals */}
      {/* {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-lg shadow-xl relative w-[90%] max-w-md">
            <Login onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}

      {showSignUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-lg shadow-xl relative w-[90%] max-w-md">
            <SignUp onClose={() => setShowSignUp(false)} onSignupSuccess={handleSignupSuccess} />
          </div>
        </div>
      )} */}
    </div>
  );
};

export default Dashboard;