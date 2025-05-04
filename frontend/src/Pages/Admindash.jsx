import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import recruitment from "../assets/recruitment.png";
import task from "../assets/task.png";
import attendance from "../assets/attendance.png";
import calendar from "../assets/calendar.png";
import pay from "../assets/pay.png";
import chat from "../assets/chat.png";
import EmployeeManagement from "./EmployeeManagement";
import TaskManagement from "./TaskManagement";
import CalendarPlanning from "./CalendarPlanning";
import AdminAttendanceTracking from "./AttendanceTracking";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import axios from 'axios';

const PayrollManagement = () => <div>Manage employee salaries and payroll here.</div>;
const Chat = () => <div>Communicate with employees here.</div>;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentFeature, setCurrentFeature] = useState(null);
  const [greeting, setGreeting] = useState("");
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  
  // Analytics state with default values
  const [analyticsData, setAnalyticsData] = useState({
    employees: 0,
    tasksCompleted: 0,
    tasksInProgress: 0,
    upcomingLeaves: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Mock data for immediate display and testing
  const mockAnalyticsData = {
    employees: 3,
    tasksCompleted: 5,
    tasksInProgress: 8,
    upcomingLeaves: 2
  };
  
  // Function to fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // For immediate testing, uncomment this line to use mock data
      // setAnalyticsData(mockAnalyticsData);
      // setIsLoading(false);
      // return;
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        setErrorMessage('Authentication token not found');
        setIsLoading(false);
        
        // Fallback to mock data if no token
        setAnalyticsData(mockAnalyticsData);
        return;
      }
      
      console.log('Fetching analytics data...');
      const response = await axios.get('/api/analytics/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Analytics data received:', response.data);
      
      // Check if response data has the expected structure
      if (response.data && typeof response.data === 'object') {
        setAnalyticsData({
          employees: response.data.employees || 0,
          tasksCompleted: response.data.tasksCompleted || 0,
          tasksInProgress: response.data.tasksInProgress || 0,
          upcomingLeaves: response.data.upcomingLeaves || 0
        });
      } else {
        console.error('Invalid data structure received:', response.data);
        setErrorMessage('Invalid data structure received from server');
        // Use mock data as fallback
        setAnalyticsData(mockAnalyticsData);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setErrorMessage(`Failed to fetch data: ${error.message}`);
      setIsLoading(false);
      
      // Fallback to mock data on error
      setAnalyticsData(mockAnalyticsData);
    }
  };
  
  // Handle logout
  // const handleLogout = () => {
  //   localStorage.removeItem('token');
  //   localStorage.removeItem('user');
  //   setIsLoggedIn(false);
  //   setUsername("");
  // };
  const handleLogout = (e) => {
    e.preventDefault();
    console.log("Logout clicked");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUsername('');
    window.location.href = '/'; // ✅ make sure this is your correct login route
  };
  
  // useEffect to set greeting and check login status
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
    
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setIsLoggedIn(true);
        setUsername(userData.username || "User");
        
        // Fetch analytics data when component mounts and user is logged in
        fetchAnalyticsData();
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem('user');
      }
    } else {
      // If not logged in, still show some data for demo purposes
      setAnalyticsData(mockAnalyticsData);
      setIsLoading(false);
    }
  }, []);
  
  // Refresh analytics data when needed (e.g., after task update)
  const refreshAnalytics = () => {
    fetchAnalyticsData();
  };
  
  // Modified Analytics Cards Section
  const renderAnalyticsCards = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Employee Card */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-5 transition-transform hover:translate-y-[-3px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Employees</p>
              {isLoading ? (
                <p className="text-2xl font-bold text-gray-300 mt-1">...</p>
              ) : (
                <p className="text-2xl font-bold text-gray-800 mt-1">{analyticsData.employees}</p>
              )}
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                +4.2% this month
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Tasks Completed Card */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-5 transition-transform hover:translate-y-[-3px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Tasks Completed</p>
              {isLoading ? (
                <p className="text-2xl font-bold text-gray-300 mt-1">...</p>
              ) : (
                <p className="text-2xl font-bold text-gray-800 mt-1">{analyticsData.tasksCompleted}</p>
              )}
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                +12% this week
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Tasks In Progress Card */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-5 transition-transform hover:translate-y-[-3px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Tasks In Progress</p>
              {isLoading ? (
                <p className="text-2xl font-bold text-gray-300 mt-1">...</p>
              ) : (
                <p className="text-2xl font-bold text-gray-800 mt-1">{analyticsData.tasksInProgress}</p>
              )}
              <p className="text-xs text-yellow-600 mt-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                No change
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Upcoming Leaves Card */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-5 transition-transform hover:translate-y-[-3px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Upcoming Leaves</p>
              {isLoading ? (
                <p className="text-2xl font-bold text-gray-300 mt-1">...</p>
              ) : (
                <p className="text-2xl font-bold text-gray-800 mt-1">{analyticsData.upcomingLeaves}</p>
              )}
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                +2 since last week
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Error message display component
  const renderErrorMessage = () => {
    if (errorMessage) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error loading analytics: {errorMessage}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="text-sm underline hover:text-red-800 mt-1"
          >
            Try again
          </button>
        </div>
      );
    }
    return null;
  };

  const renderFeatureContent = () => {
    switch (currentFeature) {
      case "employeeManagement":
        return <EmployeeManagement onBack={() => setCurrentFeature(null)} />;
      case "taskManagement":
        return <TaskManagement onBack={() => setCurrentFeature(null)} />;
      case "calendarPlanning":
        return <CalendarPlanning onBack={() => setCurrentFeature(null)} />;
      case "attendanceTracking":
        return <AdminAttendanceTracking onBack={() => setCurrentFeature(null)} />;
      case "payrollManagement":
        return <PayrollManagement />;
      case "chat":
        return <Chat />;
      default:
        return null;
    }
  };

  const features = [
    { label: "Employee Management", key: "employeeManagement", image: recruitment },
    { label: "Task Management", key: "taskManagement", image: task },
    { label: "Calendar Planning", key: "calendarPlanning", image: calendar },
    { label: "Attendance Tracking", key: "attendanceTracking", image: attendance },
    { label: "Payroll Management", key: "payrollManagement", image: pay },
    { label: "Chat", key: "chat", image: chat },
  ];

  const tasks = [
    { title: "Review Q1 Financial Reports", priority: "high", deadline: "Today", assigned: "Arsha" },
    { title: "Schedule Executive Team Meeting", priority: "medium", deadline: "Tomorrow", assigned: "saniyajimin" },
    { title: "Approve Leave Requests (5)", priority: "medium", deadline: "Mar 24", assigned: "saniyastha" },
  ];

  // Simple Calendar for Dashboard
  const renderSimpleCalendar = () => {
    const currentDate = new Date();
    const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const rows = [];
    let days = [];
    let day = startDate;
    
    // Add header row with day names
    const headerRow = daysOfWeek.map((dayName, index) => (
      <div key={`header-${index}`} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-500">
        {dayName}
      </div>
    ));
    rows.push(
      <div key="header" className="grid grid-cols-7 gap-1 mb-1">
        {headerRow}
      </div>
    );
    
    // Generate calendar days
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        days.push(
          <div
            key={day.toString()}
            className={`w-8 h-8 flex items-center justify-center text-xs rounded-full
              ${!isSameMonth(day, monthStart) ? "text-gray-300" : "text-gray-700"}
              ${isSameDay(day, currentDate) ? "bg-blue-600 text-white" : ""}`}
          >
            {format(day, "d")}
          </div>
        );
        day = addDays(day, 1);
      }
      
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }
    
    return (
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">{format(currentDate, "MMMM yyyy")}</h2>
          <button 
            onClick={() => setCurrentFeature("calendarPlanning")}
            className="text-blue-600 text-sm font-medium hover:text-blue-800 transition"
          >
            View Full Calendar
          </button>
        </div>
        <div className="space-y-1">{rows}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Modern Header with Shadow & Gradient */}
      <header className="sticky top-0 z-10 bg-green-900 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl text-white font-bold">OfficeCorner</h1>
            <span className="ml-2 bg-green-700 text-xs text-blue-100 px-2 py-1 rounded-full">ADMIN</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center text-white text-sm mr-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{today}</span>
            </div>
            <div tabIndex={0} className="relative group focus:outline-none"> 
              {isLoggedIn && (
                <div  onClick={() => setIsDropdownOpen(prev => !prev)} className="flex items-center space-x-2 bg-green-700 bg-opacity-50 text-white px-4 py-2 rounded-lg hover:bg-opacity-70 transition cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-medium">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:inline">{username}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}  
              <div className={`absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 transition ${isDropdownOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <a href="#" className="block px-4 py-2 text-gray-800 hover:bg-gray-50 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </a>
                <a href="#" className="block px-4 py-2 text-gray-800 hover:bg-gray-50 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </a>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                  </svg>
                  Logout
                </button>
              </div> 
            </div>
          </div>
        </div>
      </header>

      <div className="flex-grow container mx-auto px-4 sm:px-6 py-6">
        {currentFeature ? (
          <div className="w-full bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
            <div className="flex items-center p-6 bg-gray-50 border-b border-gray-100">
              <button
                onClick={() => setCurrentFeature(null)}
                className="mr-4 p-2 bg-white text-gray-600 rounded hover:bg-gray-100 transition border border-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <h2 className="text-xl font-bold text-gray-800">
                {features.find(f => f.key === currentFeature)?.label}
              </h2>
            </div>
            <div className="p-6">
              {/* Display error message if there is one */}
              {renderErrorMessage()}
              {/* Display analytics cards */}
              {renderAnalyticsCards()}
              {/* Render feature content */}
              {renderFeatureContent()}
            </div>
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{greeting}, {username}</h2>
              <p className="text-gray-600">Here's your management overview for today.</p>
            </div>
            
            {/* Display error message if there is one */}
            {renderErrorMessage()}
            
            {/* Analytics Cards */}
            {renderAnalyticsCards()}
            
            {/* Features Grid */}
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              Management Modules
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {features.map((feature) => (
                <button
                  key={feature.key}
                  onClick={() => setCurrentFeature(feature.key)}
                  className="bg-white rounded-lg shadow border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-md flex flex-col items-center justify-center p-5 h-36"
                >
                  <div className="bg-gray-50 p-3 rounded-full mb-3 border border-gray-100">
                    <img src={feature.image} alt={feature.label} className="w-8 h-8" />
                  </div>
                  <span className="text-gray-800 font-medium text-center text-sm">{feature.label}</span>
                </button>
              ))}
            </div>
            
            {/* Calendar and Tasks Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar Column */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendar
                </h3>
                {renderSimpleCalendar()}
                
                <div className="mt-6 bg-white rounded-lg shadow border border-gray-100 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-gray-800">Upcoming Events</h3>
                    <button 
                      onClick={() => setCurrentFeature("calendarPlanning")}
                      className="text-sm text-blue-600 font-medium hover:text-blue-800 transition"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start p-3 bg-blue-50 rounded border border-blue-100">
                      <div className="mr-3 bg-white p-2 rounded-lg border border-blue-200 text-blue-800 text-center">
                        <div className="text-xs font-bold">APR</div>
                        <div className="text-lg font-bold">12</div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">Monthly Staff Meeting</h4>
                        <p className="text-xs text-gray-600">9:00 AM - 10:30 AM • Conference Room</p>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-green-50 rounded border border-green-100">
                      <div className="mr-3 bg-white p-2 rounded-lg border border-green-200 text-green-800 text-center">
                        <div className="text-xs font-bold">APR</div>
                        <div className="text-lg font-bold">15</div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">Project Deadline: Website Redesign</h4>
                        <p className="text-xs text-gray-600">All Day • Marketing Team</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tasks Column */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Priority Tasks
                </h3>
                <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Task
                        </th>
                        <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Deadline
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tasks.map((task, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${task.priority === 'high' ? 'bg-red-100 text-red-800' : ''}
                              ${task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                              ${task.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                            `}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{task.deadline}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white font-medium">
                                {task.assigned.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{task.assigned}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button 
                      onClick={() => setCurrentFeature("taskManagement")}
                      className="flex items-center text-sm text-blue-600 font-medium hover:text-blue-800 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add New Task
                    </button>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <h3 className="text-lg font-bold text-gray-800 mb-4 mt-6 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Activity
                </h3>
                <div className="bg-white rounded-lg shadow border border-gray-100 p-5">
                  <div className="space-y-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          A
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Arsha</span> completed task <span className="font-medium">Update Employee Handbook</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">30 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                          P
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Pam</span> added a new employee <span className="font-medium">John Davidson</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white font-medium">
                          S
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Saniya</span> assigned <span className="font-medium">Review Q1 Financial Reports</span> to <span className="font-medium">Arsha</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Yesterday at 2:35 PM</p>
                      </div>
                    </div>
                  </div>
                  <button className="w-full mt-4 py-2 bg-gray-50 text-sm text-gray-600 rounded border border-gray-100 hover:bg-gray-100">
                    View All Activity
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-4">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500">
          <p>&copy; 2025 OfficeCorner. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default AdminDashboard;