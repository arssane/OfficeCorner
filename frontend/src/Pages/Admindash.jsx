import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import recruitment from "../assets/recruitment.png";
import task from "../assets/task.png";
import attendance from "../assets/attendance.png";
import calendar from "../assets/calendar.png";
import approve from "../assets/approve.png";
import chat from "../assets/chat.png";
import EmployeeManagement from "./EmployeeManagement";
import TaskManagement from "./TaskManagement";
import CalendarPlanning from "./CalendarPlanning";
import AdminAttendanceTracking from "./AttendanceTracking";
import DashboardAnalytics from "../Components/DashboardAnalytics";
import EmployeeApproval from "../Components/EmployeeApproval";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import axios from 'axios';

const PayrollManagement = () => <div>Manage employee salaries and payroll here.</div>;

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
  const [events, setEvents] = useState([]);
  
  // Analytics state with default values
  const [analyticsData, setAnalyticsData] = useState({
    employees: 0,
    tasksCompleted: 0,
    // tasksInProgress: 0,
    upcomingLeaves: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Mock data for immediate display and testing
  // const mockAnalyticsData = {
  //   employees: 3,
  //   tasksCompleted: 5,
  //   tasksInProgress: 8,
  //   upcomingLeaves: 2
  // };

  const featureTitles = {
    employeeManagement: "Employee Management",
    employeeApproval: "Employee Approval", 
    taskManagement: "Task Management", 
    calendarPlanning: "Calendar Planning",
    attendanceTracking: "Attendance Tracking",
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        setErrorMessage('Authentication token not found');
        setIsLoading(false);
        
        // Fallback to mock events if no token
        setEvents([
          {
            id: 1,
            title: "Monthly Staff Meeting",
            start: "2025-04-12T09:00:00",
            end: "2025-04-12T10:30:00",
            location: "Conference Room",
            type: "meeting"
          },
          {
            id: 2,
            title: "Project Deadline: Website Redesign",
            start: "2025-04-15T00:00:00",
            end: "2025-04-15T23:59:59",
            location: "Marketing Team",
            type: "deadline"
          }
        ]);
        return;
      }
      
      console.log('Fetching events data...');
      const response = await axios.get('http://localhost:5000/api/events', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Events data received:', response.data);
      
      if (response.data && Array.isArray(response.data.events)) {
        setEvents(response.data.events);
      } else {
        console.error('Invalid events data structure received:', response.data);
        setErrorMessage('Invalid data structure received from server');
        // Fallback to mock events
        setEvents([
          {
            id: 1,
            title: "Monthly Staff Meeting",
            start: "2025-04-12T09:00:00",
            end: "2025-04-12T10:30:00",
            location: "Conference Room",
            type: "meeting"
          },
          {
            id: 2,
            title: "Project Deadline: Website Redesign",
            start: "2025-04-15T00:00:00",
            end: "2025-04-15T23:59:59",
            location: "Marketing Team",
            type: "deadline"
          }
        ]);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching events data:', error);
      setErrorMessage(`Failed to fetch events: ${error.message}`);
      setIsLoading(false);
      
      // Fallback to mock events on error
      setEvents([
        {
          id: 1,
          title: "Monthly Staff Meeting",
          start: "2025-04-12T09:00:00",
          end: "2025-04-12T10:30:00",
          location: "Conference Room",
          type: "meeting"
        },
        {
          id: 2,
          title: "Project Deadline: Website Redesign",
          start: "2025-04-15T00:00:00",
          end: "2025-04-15T23:59:59",
          location: "Marketing Team",
          type: "deadline"
        }
      ]);
    }
  };

  const refreshDashboardData = () => {
    fetchAnalyticsData();
    fetchEvents();
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
        // setAnalyticsData(mockAnalyticsData);
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
          // tasksInProgress: response.data.tasksInProgress || 0,
          upcomingLeaves: response.data.upcomingLeaves || 0
        });
      } else {
        console.error('Invalid data structure received:', response.data);
        setErrorMessage('Invalid data structure received from server');
        // Use mock data as fallback
        // setAnalyticsData(mockAnalyticsData);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setErrorMessage(`Failed to fetch data: ${error.message}`);
      setIsLoading(false);
      
      // Fallback to mock data on error
      // setAnalyticsData(mockAnalyticsData);
    }
  };
  
  const handleLogout = (e) => {
    e.preventDefault();
    console.log("Logout clicked");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUsername('');
    window.location.href = '/';
  };

  const handleBackToDashboard = () => {
    setCurrentFeature(null);
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
        
        // Fetch analytics and events data when component mounts and user is logged in
        fetchAnalyticsData();
        fetchEvents();
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem('user');
      }
    } else {
      // If not logged in, still show some data for demo purposes
      setAnalyticsData(mockAnalyticsData);
      setEvents([
        {
          id: 1,
          title: "Monthly Staff Meeting",
          start: "2025-04-12T09:00:00",
          end: "2025-04-12T10:30:00",
          location: "Conference Room",
          type: "meeting"
        },
        {
          id: 2,
          title: "Project Deadline: Website Redesign",
          start: "2025-04-15T00:00:00",
          end: "2025-04-15T23:59:59",
          location: "Marketing Team",
          type: "deadline"
        }
      ]);
      setIsLoading(false);
    }
  }, []);
  
  // Refresh analytics data when needed (e.g., after task update)
  // const refreshAnalytics = () => {
  //   fetchAnalyticsData();
  // };

  const renderUpcomingEvents = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-pulse text-gray-400">Loading events...</div>
        </div>
      );
    }
  
    if (events.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No upcoming events scheduled
        </div>
      );
    }

    // Get current date at start of day for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    // Filter out past events first, then sort by start date
    const futureEvents = events.filter(event => {
      const eventDate = new Date(event.start || event.date || 0);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today; // Only include events that are today or in the future
    });

    // Sort filtered events by start date
    const sortedEvents = futureEvents.sort((a, b) => 
      (new Date(a.start || a.date || 0) - new Date(b.start || b.date || 0))
    );
    
    // Take only the first few events
    const upcomingEvents = sortedEvents.slice(0, 4);

    // Check if no upcoming events after filtering
    if (upcomingEvents.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No upcoming events scheduled
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {upcomingEvents.map(event => {
          // Use _id as the key if id is not available
          const eventId = event.id || event._id;
          // Use date field if start is not available
          const eventStart = event.start || event.date;
          const eventEnd = event.end || event.date;
          
          // Only continue if we have valid data to display
          if (!eventId || !eventStart) {
            return null;
          }
          
          const eventDate = new Date(eventStart);
          const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
          const day = eventDate.getDate();
          
          // Determine background color based on event type
          let bgColor = "bg-green-50";
          let borderColor = "border-green-100";
          let dateTextColor = "text-green-800";
          let dateBorderColor = "border-green-200";
          
          if (event.type === "deadline") {
            bgColor = "bg-green-50";
            borderColor = "border-green-100";
            dateTextColor = "text-green-800";
            dateBorderColor = "border-green-200";
          } else if (event.type === "leave") {
            bgColor = "bg-purple-50";
            borderColor = "border-purple-100";
            dateTextColor = "text-purple-800";
            dateBorderColor = "border-purple-200";
          }
          
          // Format time for display
          let timeDisplay = "";
          if (eventStart && eventEnd) {
            try {
              const startTime = new Date(eventStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTime = new Date(eventEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              timeDisplay = `${startTime} - ${endTime}`;
              
              // Check if it's an all-day event
              const startDay = new Date(eventStart).setHours(0, 0, 0, 0);
              const endDay = new Date(eventEnd).setHours(0, 0, 0, 0);
              const durationHours = (new Date(eventEnd) - new Date(eventStart)) / (1000 * 60 * 60);
              
              if (durationHours >= 23 && durationHours <= 25) {
                timeDisplay = "All Day";
              }
            } catch (e) {
              console.error("Error formatting time:", e);
              timeDisplay = "Time not available";
            }
          }
          
          return (
            <div key={eventId} className={`flex items-start p-3 ${bgColor} rounded border ${borderColor}`}>
              <div className={`mr-3 bg-white p-2 rounded-lg border ${dateBorderColor} ${dateTextColor} text-center`}>
                <div className="text-xs font-bold">{month}</div>
                <div className="text-lg font-bold">{day}</div>
              </div>
              <div>
                <h4 className="text-sm font-semibold">{event.title}</h4>
                <p className="text-xs text-gray-600">{event.startTime && event.endTime ? 
                  `${formatTime(event.startTime)} - ${formatTime(event.endTime)}` : 
                  "All day"}</p>
                <p className="text-xs text-gray-600">• {event.description || "No description"}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFeatureContent = () => {
    switch (currentFeature) {
      case "employeeManagement":
        return <EmployeeManagement onBack={handleBackToDashboard} />;
      case "employeeApproval":
        return <EmployeeApproval onBack={handleBackToDashboard} />; 
      case "taskManagement":
        return <TaskManagement onBack={handleBackToDashboard} />;
      case "calendarPlanning":
        return <CalendarPlanning onBack={handleBackToDashboard} />;
      case "attendanceTracking":
        return <AdminAttendanceTracking onBack={handleBackToDashboard} />;
      case "payrollManagement":
        return <PayrollManagement />;
      case "chat":
        return <Chat />;
      default:
        return null;
    }
  };

  const features = [
    { label: "Employee Approval", key: "employeeApproval", image: approve }, 
    { label: "Employee Management", key: "employeeManagement", image: recruitment },
    { label: "Task Management", key: "taskManagement", image: task },
    { label: "Calendar Planning", key: "calendarPlanning", image: calendar },
    { label: "Attendance Tracking", key: "attendanceTracking", image: attendance },
    // { label: "Chat", key: "chat", image: chat },
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
    let dayCounter = 0;
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        const dayFormatted = format(cloneDay, "d");
        days.push(
          <div
            key={`day-${dayCounter}`}
            className={`w-8 h-8 flex items-center justify-center text-xs rounded-full
              ${!isSameMonth(cloneDay, monthStart) ? "text-gray-300" : "text-gray-700"}
              ${isSameDay(cloneDay, currentDate) ? "bg-green-600 text-white" : ""}`}
          >
            {dayFormatted}
          </div>
        );
        day = addDays(day, 1);
        dayCounter++;
      }
      
      rows.push(
        <div key={`row-${dayCounter}`} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }
    
    return (
      <div className="bg-white p-8 rounded-lg shadow border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">{format(currentDate, "MMMM yyyy")}</h2>
          <button 
            onClick={() => setCurrentFeature("calendarPlanning")}
            className="text-green-600 text-sm font-medium hover:text-green-800 transition"
          >
            View Full Calendar
          </button>
        </div>
        <div className="space-y-1">{rows}</div>
      </div>
    );
  };
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Enhanced Header with Back Button */}
      <header className="sticky top-0 z-10 bg-green-900 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            {/* Back Button - Shows when viewing a feature */}
            {currentFeature && (
              <button
                onClick={handleBackToDashboard}
                className="flex items-center text-white hover:text-green-200 transition-colors mr-4 bg-green-800 bg-opacity-50 px-3 py-2 rounded-lg hover:bg-opacity-70"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                  />
                </svg>
                <span className="text-sm font-medium">Back to Dashboard</span>
              </button>
            )}
            
            {/* Title Section */}
            <div className="flex items-center">
              <h1 className="text-2xl text-white font-bold">OfficeCorner</h1>
              <span className="ml-2 bg-green-700 text-xs text-blue-100 px-2 py-1 rounded-full">ADMIN</span>
              {/* Feature Title - Shows current section */}
              {currentFeature && (
                <div className="ml-4 flex items-center text-green-200">
                  <span className="text-lg">•</span>
                  <span className="ml-2 text-lg font-medium">{featureTitles[currentFeature]}</span>
                </div>
              )}
            </div>
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
                <div onClick={() => setIsDropdownOpen(prev => !prev)} className="flex items-center space-x-2 bg-green-700 bg-opacity-50 text-white px-4 py-2 rounded-lg hover:bg-opacity-70 transition cursor-pointer">
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
                {/* <a href="#" className="block px-4 py-2 text-gray-800 hover:bg-gray-50 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </a>
                <a href="#" className="block px-4 py-2 text-gray-800 hover:bg-gray-50 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </a> */}
                <hr className="my-1 border-gray-100" />
                <a href="#" onClick={handleLogout} className="block px-4 py-2 text-red-600 hover:bg-gray-50 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentFeature ? (
        renderFeatureContent()
      ) : (
        <div className="container mx-auto px-6 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{greeting}, {username || "Admin"}!</h2>
            <p className="text-gray-600">Here's what's happening in your workplace today.</p>
          </div>
          
          {/* {renderErrorMessage()} */}
            
          {/* Analytics Cards */}
          {<DashboardAnalytics  authToken={authToken} />}
          
          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Features */}
            <div className="lg:col-span-3 space-y-6">
              {/* Features Grid */}
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Access</h3>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-4">
                  {features.map((feature) => (
                    <div
                      key={feature.key}
                      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col items-center text-center"
                      onClick={() => setCurrentFeature(feature.key)}
                    >
                      <img src={feature.image} alt={feature.label} className="w-12 h-12 mb-2" />
                      <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Right Column - Calendar & Events */}
            <div className="lg:col-span-8 space-y-6">
              {/* Mini Calendar */}
              {renderSimpleCalendar()}
              
              {/* Upcoming Events */}
              <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Upcoming Events</h3>
                  <button 
                    onClick={() => setCurrentFeature("calendarPlanning")}
                    className="text-green-600 text-sm font-medium hover:text-green-800 transition"
                  >
                    View All Events
                  </button>
                </div>
                {renderUpcomingEvents()}
              </div>
            </div>
          </div>
          
          {/* Refresh Data Button */}
          <div className="mt-6 flex justify-center">
            <button 
              onClick={refreshDashboardData}
              className="flex items-center text-green-800 bg-green-100 px-4 py-2 rounded-lg hover:bg-green-200 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Dashboard Data
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600 mb-2 md:mb-0">
              © 2025 OfficeCorner. All rights reserved.
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Terms of Service</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Help Center</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;