import React, { useState, useEffect } from 'react';
import { Calendar, MousePointerClick, RefreshCw } from 'lucide-react';
import axios from 'axios';
import CalendarPlanning from './CalendarPlanning';
import { GrView } from "react-icons/gr";
import { Link, useNavigate } from 'react-router-dom';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Attendance State
  const [attendanceHistory, setAttendanceHistory] = useState([
    { date: 'Mar 21, 2025', timeIn: '08:52 AM', timeOut: '05:07 PM', status: 'Present' },
    { date: 'Mar 20, 2025', timeIn: '09:05 AM', timeOut: '05:15 PM', status: 'Present' },
    { date: 'Mar 19, 2025', timeIn: '08:48 AM', timeOut: '05:03 PM', status: 'Present' },
    { date: 'Mar 18, 2025', timeIn: '-', timeOut: '-', status: 'Vacation' },
    { date: 'Mar 17, 2025', timeIn: '08:59 AM', timeOut: '04:58 PM', status: 'Present' },
  ]);

  // Sample events data
  const events = [
    { id: 1, title: 'Team Meeting', date: 'Mar 22, 2025', time: '10:00 AM - 11:00 AM', location: 'Conference Room A' },
    { id: 2, title: 'Project Kickoff', date: 'Mar 24, 2025', time: '02:00 PM - 03:30 PM', location: 'Main Office' },
    { id: 3, title: 'Client Presentation', date: 'Mar 25, 2025', time: '11:00 AM - 12:30 PM', location: 'Virtual' },
    { id: 4, title: 'Department Lunch', date: 'Mar 26, 2025', time: '12:30 PM - 01:30 PM', location: 'Cafeteria' },
    { id: 5, title: 'Training Session', date: 'Mar 28, 2025', time: '09:00 AM - 12:00 PM', location: 'Training Room' },
  ];

  // Fallback employee data
  const fallbackEmployee = {
    id: "fallback-employee-id",
    name: "Employee",
    email: "employee@example.com",
    department: "General",
    position: "Staff"
  };

  // Initialize currentEmployee with better error handling
  const [currentEmployee, setCurrentEmployee] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const displayName = (parsedUser.name && parsedUser.name !== 'Employee') ? parsedUser.name : (parsedUser.username || 'Employee');
        return {
          id: parsedUser.id || parsedUser._id,
          name: displayName,
          email: parsedUser.email,
          department: parsedUser.department || 'General',
          position: parsedUser.position || 'Staff',
          username: parsedUser.username,
          status: parsedUser.status
        };
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
    }
    return null;
  });

  // Check authentication status
  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      console.log('No authentication found, redirecting to login');
      setIsLoggedIn(false);
      setAuthChecked(true);
      navigate('/login');
      return false;
    }

    try {
      const parsedUser = JSON.parse(user);
      
      // Check if user status is pending
      if (parsedUser.status === 'pending') {
        console.log('User status is pending, redirecting to pending page');
        navigate('/employee-pending');
        return false;
      }

      setIsLoggedIn(true);
      setAuthChecked(true);
      return true;
    } catch (e) {
      console.error('Error parsing user data:', e);
      setIsLoggedIn(false);
      setAuthChecked(true);
      navigate('/login');
      return false;
    }
  };

  const toggleProfileDropdown = () => setProfileDropdownOpen(prev => !prev);
  const closeProfileDropdown = () => setProfileDropdownOpen(false);
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const handleLogout = (e) => {
    e.preventDefault();
    console.log("Logout clicked");
    localStorage.clear();
    setIsLoggedIn(false);
    setCurrentEmployee(null);
    setTasks([]);
    setAttendanceHistory([]);
    navigate("/login");
  };

  // Get API configuration
  const getApiBaseUrl = () => {
    return localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
  };

  const getTaskEndpoint = () => {
    const storedEndpoint = localStorage.getItem("taskEndpoint");
    if (storedEndpoint) return storedEndpoint;
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/tasks`;
  };

  // Enhanced profile fetching with better error handling
  const fetchEmployeeProfile = async () => {
    if (!checkAuthStatus()) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.warn("No authentication token found");
        navigate('/login');
        return;
      }

      const baseUrl = getApiBaseUrl();
      const possibleEndpoints = [
        `${baseUrl}/auth/profile`,
        `${baseUrl}/user/profile`,
        `${baseUrl}/employee/profile`,
        `${baseUrl}/auth/me`,
        `${baseUrl}/me`
      ];

      let success = false;
      let fetchedUserData = null;
      let successfulEndpoint = '';

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying profile endpoint: ${endpoint}`);

          const response = await axios.get(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            timeout: 10000
          });

          if (response.status >= 200 && response.status < 300 && response.data) {
            console.log(`Success with profile endpoint: ${endpoint}`);
            fetchedUserData = response.data.user || response.data;
            success = true;
            successfulEndpoint = endpoint;
            break;
          }
        } catch (error) {
          console.log(`Failed with profile endpoint ${endpoint}:`, error.message);
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            console.error("Unauthorized: Token invalid or expired");
            handleLogout(new Event('click'));
            return;
          }
          continue;
        }
      }

      if (success && fetchedUserData) {
        // Check if user status is still pending
        if (fetchedUserData.status === 'pending') {
          console.log('User status is still pending');
          navigate('/employee-pending');
          return;
        }

        const displayedName = (fetchedUserData.name && fetchedUserData.name !== 'Employee') 
          ? fetchedUserData.name 
          : (fetchedUserData.username || 'Employee');

        const employeeData = {
          id: fetchedUserData.id || fetchedUserData._id,
          name: displayedName,
          email: fetchedUserData.email,
          department: fetchedUserData.department || 'General',
          position: fetchedUserData.position || 'Staff',
          username: fetchedUserData.username,
          status: fetchedUserData.status
        };

        setCurrentEmployee(employeeData);

        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify({
          id: fetchedUserData.id || fetchedUserData._id,
          _id: fetchedUserData._id || fetchedUserData.id,
          username: fetchedUserData.username,
          name: fetchedUserData.name,
          email: fetchedUserData.email,
          role: fetchedUserData.role,
          status: fetchedUserData.status || 'approved',
          department: fetchedUserData.department || 'General',
          position: fetchedUserData.position || 'Staff',
          phone: fetchedUserData.phone || '',
          address: fetchedUserData.address || '',
          createdAt: fetchedUserData.createdAt || new Date().toISOString()
        }));

        localStorage.setItem('employeeName', fetchedUserData.name || fetchedUserData.username || 'Employee');
        localStorage.setItem('employeeDepartment', fetchedUserData.department || 'General');
        localStorage.setItem('employeeEmail', fetchedUserData.email);
        localStorage.setItem('employeeId', fetchedUserData.id || fetchedUserData._id);
        localStorage.setItem('employeePosition', fetchedUserData.position || 'Staff');
        localStorage.setItem("profileEndpoint", successfulEndpoint);
        
        setIsLoggedIn(true);
        setLastFetchTime(new Date());
        setError(null);
      } else {
        console.warn("All profile endpoints failed");
        setError("Failed to fetch profile information");
        // Don't use fallback for authenticated users - redirect to login instead
        navigate('/login');
      }

    } catch (err) {
      console.error("Error fetching employee profile:", err);
      setError("Failed to fetch profile information");
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateString;
    }
  };

  // Attendance functions
  const handleLocalAttendanceFallback = () => {
    console.log("Falling back to local attendance recording");
    alert("Could not connect to server to record attendance. Please try again later.");
  };

  const handleManualAttendance = async () => {
    if (!checkAuthStatus()) return;

    try {
      console.log("Starting attendance recording");
      const token = localStorage.getItem("token");
      
      if (!token) {
        alert("Authentication token not found. Please log in again.");
        navigate('/login');
        return;
      }

      const baseUrl = getApiBaseUrl();
      const attendanceEndpoint = `${baseUrl}/attendance/record`;

      const employeeId = currentEmployee?.id || localStorage.getItem("employeeId");

      if (!employeeId) {
        console.error("No employee ID found");
        alert("Employee ID not found. Please log in again.");
        navigate('/login');
        return;
      }

      const requestData = { employeeId };
      const requestHeaders = {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      setLoading(true);

      const response = await axios.post(attendanceEndpoint, requestData, {
        headers: requestHeaders,
        timeout: 10000
      });

      if (response.data.success) {
        console.log("Attendance recorded successfully");
        await fetchAttendanceHistory(employeeId);
        alert(`Success: ${response.data.message}`);
      } else {
        console.error("Server returned unsuccessful response:", response.data);
        alert(response.data.message || "Failed to record attendance");
      }

    } catch (error) {
      console.error("Error recording attendance:", error);
      if (error.response?.status === 401) {
        alert("Session expired. Please log in again.");
        handleLogout(new Event('click'));
      } else if (error.response) {
        const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        alert(`Failed to record attendance: ${errorMessage}`);
      } else if (error.request) {
        alert("Network error: Unable to connect to server. Check your internet connection.");
        handleLocalAttendanceFallback();
      } else {
        alert(`Request failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async (employeeId) => {
    if (!checkAuthStatus()) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      setLoading(true);
      const baseUrl = getApiBaseUrl();
      const historyEndpoint = `${baseUrl}/attendance/employee/${employeeId}`;

      const response = await axios.get(historyEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.success) {
        setAttendanceHistory(response.data.data);
        setError(null);
      } else {
        console.error('Failed to fetch attendance history:', response.data.message);
      }
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      if (error.response?.status === 401) {
        console.error("Unauthorized access to attendance history");
        handleLogout(new Event('click'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Enhanced task fetching
  const fetchEmployeeTasks = async (employeeId, forceRefresh = false) => {
    if (!checkAuthStatus()) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("Authentication token not found");
        return;
      }

      setLoading(true);
      setError(null);

      const timestamp = new Date().getTime();
      const taskEndpoint = getTaskEndpoint();
      const urlWithParams = `${taskEndpoint}?_t=${timestamp}&refresh=${forceRefresh ? '1' : '0'}`;

      const response = await axios.get(urlWithParams, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        timeout: 15000,
        validateStatus: function (status) {
          return status < 500;
        }
      });

      if (response.status >= 200 && response.status < 300) {
        let allTasks = [];
        
        if (Array.isArray(response.data)) {
          allTasks = response.data;
        } else if (response.data?.tasks && Array.isArray(response.data.tasks)) {
          allTasks = response.data.tasks;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          allTasks = response.data.data;
        } else if (response.data && typeof response.data === 'object') {
          const possibleTasks = Object.values(response.data).find(val => Array.isArray(val));
          allTasks = possibleTasks || [];
        }

        // Filter out deleted tasks
        const activeTasks = allTasks.filter(task => {
          return !task.deleted &&
                 !task.isDeleted &&
                 task.status !== 'deleted' &&
                 task.active !== false;
        });

        if (activeTasks.length === 0) {
          setTasks([]);
          setLastFetchTime(new Date().toLocaleTimeString());
          return;
        }

        // Filter tasks for current employee
        if (!employeeId || employeeId === "fallback-employee-id") {
          setTasks(activeTasks);
        } else {
          const employeeTasks = activeTasks.filter(task => {
            const taskAssignedTo = task.assignedTo || task.assigned_to || task.employeeId ||
                                 task.employee_id || task.employee?.id || task.employee?._id;
            if (!taskAssignedTo) return true;
            return taskAssignedTo.toString() === employeeId.toString();
          });

          setTasks(employeeTasks.length > 0 ? employeeTasks : activeTasks);
        }

        setLastFetchTime(new Date().toLocaleTimeString());
        setError(null);

      } else if (response.status === 401) {
        setError("Authentication failed - please log in again");
        handleLogout(new Event('click'));
      } else {
        setError(`Failed to fetch tasks: ${response.status}`);
        setTasks([]);
      }
    } catch (err) {
      console.error("Error fetching employee tasks:", err);
      
      if (err.code === 'ECONNABORTED') {
        setError("Request timeout - please try again");
      } else if (err.response?.status === 401) {
        setError("Authentication failed - please log in again");
        handleLogout(new Event('click'));
      } else if (err.response?.status >= 500) {
        setError("Server error - please try again later");
      } else {
        setError("Failed to fetch tasks - check your connection");
      }
      
      if (err.response?.status !== 401) {
        // Keep existing tasks on non-auth errors
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (currentEmployee) {
      console.log("Manual refresh triggered");
      await fetchEmployeeTasks(currentEmployee.id || currentEmployee._id, true);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId, newStatus) => {
    if (!checkAuthStatus()) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Authentication token not found. Please log in first.");
        navigate('/login');
        return;
      }

      const taskToUpdate = tasks.find(task =>
        (task.id && task.id === taskId) || (task._id && task._id === taskId)
      );

      if (!taskToUpdate) {
        console.error("Task not found with ID:", taskId);
        return;
      }

      const updateData = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      // Optimistically update the UI
      setTasks(prevTasks =>
        prevTasks.map(task => {
          const taskMatch = (task.id && task.id === taskId) || (task._id && task._id === taskId);
          return taskMatch
            ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
            : task;
        })
      );

      const baseEndpoint = getTaskEndpoint();
      const possibleEndpoints = [
        `${baseEndpoint}/${taskId}`,
        `${baseEndpoint}/update/${taskId}`,
        `${baseEndpoint}/${taskId}/status`,
      ];

      let updateSuccess = false;
      let lastError = null;

      for (const endpoint of possibleEndpoints) {
        for (const method of ['put', 'patch', 'post']) {
          try {
            const response = await axios[method](endpoint, updateData, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });

            if (response.status >= 200 && response.status < 300) {
              updateSuccess = true;
              if (response.data) {
                setTasks(prevTasks => prevTasks.map(task => {
                  const taskMatch = (task.id && task.id === taskId) || (task._id && task._id === taskId);
                  return taskMatch ? { ...task, ...response.data } : task;
                })
                );
              }
              alert(`Task marked as ${newStatus.replace('-', ' ')}`);
              break;
            }
          } catch (err) {
            lastError = err;
            continue;
          }
        }
        if (updateSuccess) break;
      }

      if (!updateSuccess) {
        throw lastError || new Error("All update methods failed");
      }
    } catch (err) {
      console.error("Error updating task:", err);
      
      // Revert optimistic update
      const originalTask = tasks.find(task => (task.id && task.id === taskId) || (task._id && task._id === taskId));
      if (originalTask) {
        setTasks(prevTasks => prevTasks.map(task => {
          const taskMatch = (task.id && task.id === taskId) || (task._id && task._id === taskId);
          return taskMatch ? originalTask : task;
        }));
      }

      if (err.response?.status === 403) {
        alert("You don't have permission to update this task.");
      } else if (err.response?.status === 404) {
        alert("Task update endpoint not found. Please contact your administrator.");
      } else if (err.response?.status === 401) {
        alert("Session expired. Please log in again.");
        handleLogout(new Event('click'));
      } else {
        alert(`Failed to update task: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Modal handlers
  const handleOpenModal = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  // Sort tasks: Incomplete first, then by deadline
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status !== 'Completed' && b.status === 'Completed') return -1;
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    const eventDays = events.map(event => event.date);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `Mar ${i}, 2025`;
      const hasEvent = eventDays.includes(dateStr);
      const isToday = i === currentDate.getDate();
      
      days.push(
        <div 
          key={i} 
          className={`h-12 flex flex-col justify-center items-center rounded-md cursor-pointer hover:bg-gray-100 ${
            isToday ? 'bg-blue-100 font-bold text-blue-600' : ''
          } ${hasEvent ? 'border-2 border-blue-400' : ''}`}
        >
          <span>{i}</span>
          {hasEvent && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>}
        </div>
      );
    }
    return days;
  };

  // Effect hooks
  useEffect(() => {
    if (!authChecked) {
      checkAuthStatus();
    }
  }, [authChecked]);

  useEffect(() => {
    if (authChecked && isLoggedIn) {
      fetchEmployeeProfile();

      // Set up refresh interval
      const refreshInterval = setInterval(() => {
        if (currentEmployee) {
          fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
          fetchAttendanceHistory(currentEmployee.id || currentEmployee._id);
        }
      }, 120000); // Refresh every 2 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [authChecked, isLoggedIn]);

  useEffect(() => {
    if (currentEmployee && isLoggedIn) {
      fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
      fetchAttendanceHistory(currentEmployee.id || currentEmployee._id);
    }
  }, [currentEmployee]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentEmployee && activeTab === 'tasks' && isLoggedIn) {
        fetchEmployeeTasks(currentEmployee.id || currentEmployee._id, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentEmployee, activeTab, isLoggedIn]);

  // Show loading screen while checking auth
  if (!authChecked || (loading && !currentEmployee)) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-xl text-green-700">Loading Dashboard...</div>
      </div>
    );
  }

  // Don't render if not logged in (will be redirected)
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" onClick={closeProfileDropdown}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-green-900 shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center cursor-pointer">
            <h1 className="text-2xl text-white font-bold" onClick={() => window.location.href = "/"}>
              OfficeCorner
            </h1>
            <span className="ml-2 bg-green-700 text-xs text-blue-100 px-2 py-1 rounded-full">
              {(currentEmployee?.department || 'General').toUpperCase()}
            </span>
          </div>
          <div className="hidden md:flex items-center text-white text-sm mr-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{today}</span>
          </div>
          <div className="relative">
            <button 
              className="flex items-center space-x-2 bg-green-700 bg-opacity-50 text-white px-4 py-2 rounded-lg hover:bg-opacity-70 transition" 
              onClick={toggleProfileDropdown}
            >
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-medium">
                {(currentEmployee?.name || 'Employee')[0]}
              </div>
              <span className="hidden md:inline">{currentEmployee?.name || 'Employee'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium text-gray-900">{currentEmployee?.name || 'Employee'}</p>
                  <p className="text-xs text-gray-500 truncate">{currentEmployee?.email || 'employee@example.com'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {currentEmployee?.position || 'Staff'} - {currentEmployee?.department || 'General'}
                  </p>
                </div>
                <Link to="/profile" className="block px-4 py-2 text-gray-800 hover:bg-gray-50 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`min-h-screen bg-green-800 text-white w-64 p-5 space-y-6 flex flex-col justify-between ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out fixed md:relative h-full z-40`}>
          <div>
            <h2 className="text-3xl font-bold mb-6 text-center text-green-200">EMS</h2>
            <nav>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => setActiveTab('tasks')} className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 ${activeTab === 'tasks' ? 'bg-green-700 text-white' : 'hover:bg-green-700 hover:text-white'}`} >
                    <Calendar className="mr-3" size={20} /> Tasks
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('calendar')} className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 ${activeTab === 'calendar' ? 'bg-green-700 text-white' : 'hover:bg-green-700 hover:text-white'}`} >
                    <Calendar className="mr-3" size={20} /> Calendar
                  </button>
                </li>
                {/* Attendance Tab (New from Employeedash1.jsx) */}
                <li>
                  <button onClick={() => setActiveTab('attendance')} className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 ${activeTab === 'attendance' ? 'bg-green-700 text-white' : 'hover:bg-green-700 hover:text-white'}`} >
                    <MousePointerClick className="mr-3" size={20} /> Attendance
                  </button>
                </li>
                {/* Add more navigation items as needed */}
              </ul>
            </nav>
          </div>
          <div className="mt-auto">
            <p className="text-sm text-green-300 mb-2">Last Fetched: {lastFetchTime ? formatDate(lastFetchTime) : 'N/A'}</p>
            <button onClick={handleManualRefresh} className="w-full flex items-center justify-center p-3 rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors duration-200" >
              <RefreshCw size={18} className="mr-2" /> Refresh Data
            </button>
            <Link to="/login" onClick={handleLogout} className="w-full text-left flex items-center p-3 mt-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200" >
              <MousePointerClick className="mr-3" size={20} /> Logout
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <div className="md:hidden flex justify-end mb-4">
            <button onClick={toggleSidebar} className="text-gray-600 focus:outline-none focus:text-gray-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {activeTab === 'tasks' && (
            <section className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-3xl font-bold text-green-800 mb-6 border-b-2 border-green-200 pb-3">My Tasks</h2>
              {loading && <p>Loading tasks...</p>}
              {!loading && sortedTasks.length === 0 && <p className="text-gray-600">No tasks assigned.</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedTasks.map((task) => (
                  <div key={task._id || task.id} className="bg-green-50 p-5 rounded-lg shadow-sm border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">{task.title}</h3>
                    <p className="text-sm text-gray-700 mb-3">{task.description}</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong className="text-green-700">Deadline:</strong> {formatDate(task.deadline)}</p>
                      <p><strong className="text-green-700">Priority:</strong> {task.priority}</p>
                      <p><strong className="text-green-700">Status:</strong> <span className={`font-medium ${task.status === 'Completed' ? 'text-green-500' : 'text-yellow-600'}`}>{task.status}</span></p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() => handleOpenModal(task)}
                        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 text-sm"
                      >
                        <GrView className="mr-1" /> View Details
                      </button>
                      {task.status !== 'Completed' && (
                        <button
                          onClick={() => updateTaskStatus(task._id || task.id, 'Completed')}
                          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors duration-200 text-sm"
                        >
                          Mark as Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'calendar' && (
            <section className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-3xl font-bold text-green-800 mb-6 border-b-2 border-green-200 pb-3">My Calendar</h2>
              <CalendarPlanning events={events} />
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-green-700 mb-4">Upcoming Events</h3>
                {events.length > 0 ? (
                  <ul className="space-y-3">
                    {events.map(event => (
                      <li key={event.id} className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
                        <p className="text-md font-medium text-blue-800">{event.title}</p>
                        <p className="text-sm text-gray-700"><strong className="text-blue-600">Date:</strong> {event.date}</p>
                        <p className="text-sm text-gray-700"><strong className="text-blue-600">Time:</strong> {event.time}</p>
                        <p className="text-sm text-gray-700"><strong className="text-blue-600">Location:</strong> {event.location}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">No upcoming events.</p>
                )}
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-green-700 mb-4">Calendar View</h3>
                <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-600 mb-4">
                  <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-gray-800">
                  {generateCalendarDays()}
                </div>
              </div>
            </section>
          )}

          {/* Attendance Section (New from Employeedash1.jsx) */}
          {activeTab === 'attendance' && (
            <section className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-3xl font-bold text-green-800 mb-6 border-b-2 border-green-200 pb-3">My Attendance</h2>
              <div className="flex justify-start mb-6">
                <button
                  onClick={handleManualAttendance}
                  className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 text-lg font-medium shadow-md"
                >
                  Record My Attendance
                </button>
              </div>

              {loading && <p>Loading attendance history...</p>}
              {!loading && attendanceHistory.length === 0 && <p className="text-gray-600">No attendance history found.</p>}

              {!loading && attendanceHistory.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead>
                      <tr className="bg-green-100 text-green-800 uppercase text-sm leading-normal">
                        <th className="py-3 px-6 text-left">Date</th>
                        <th className="py-3 px-6 text-left">Time In</th>
                        <th className="py-3 px-6 text-left">Time Out</th>
                        <th className="py-3 px-6 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm font-light">
                      {attendanceHistory.map((record, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-6 text-left whitespace-nowrap">{formatDate(record.date)}</td>
                          <td className="py-3 px-6 text-left">{record.timeIn}</td>
                          <td className="py-3 px-6 text-left">{record.timeOut}</td>
                          <td className="py-3 px-6 text-left">
                            <span className={`py-1 px-3 rounded-full text-xs font-medium ${
                              record.status === 'Present' ? 'bg-green-200 text-green-800' :
                              record.status === 'Absent' ? 'bg-red-200 text-red-800' :
                              'bg-yellow-200 text-yellow-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Task Details Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-2xl font-bold"
            >
              &times;
            </button>
            <h3 className="text-2xl font-semibold mb-6 text-green-900 border-b-2 border-green-300 pb-2">Task Details</h3>
            <div className="space-y-4 text-sm text-gray-800">
              <p className="flex items-center"><strong className="w-20 text-green-700">Title:</strong> {selectedTask.title}</p>
              <p className="flex items-center"><strong className="w-20 text-green-700">Description:</strong> {selectedTask.description}</p>
              <p className="flex items-center"><strong className="w-20 text-green-700">Deadline:</strong> {formatDate(selectedTask.deadline)}</p>
              <p className="flex items-center"><strong className="w-20 text-green-700">Priority:</strong> {selectedTask.priority}</p>
              <p className="flex items-center"><strong className="w-20 text-green-700">Status:</strong> {selectedTask.status}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;