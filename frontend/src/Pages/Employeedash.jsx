import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, MousePointerClick, RefreshCw, Eye, Paperclip, Upload, XCircle, CheckCircle, Check, MapPin, LogIn, LogOut, Link2, Clock, Calendar as CalendarIconLucide } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // For task details
  const [selectedTask, setSelectedTask] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // New state for completed file upload
  const [completedFile, setCompletedFile] = useState(null);
  const [uploadingCompletedFile, setUploadingCompletedFile] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);

  // Attendance State
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentAttendanceRecordId, setCurrentAttendanceRecordId] = useState(null);
  // New state to track if the user has clocked out today
  const [hasClockedOutToday, setHasClockedOutToday] = useState(false);

  // Custom Alert Modal State
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertIsError, setCustomAlertIsError] = useState(false);

  // Event states
  const [events, setEvents] = useState([]);
  const [eventErrorMessage, setEventErrorMessage] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date()); // For calendar navigation
  const [searchQuery, setSearchQuery] = useState(''); // For event search
  const [sortOrder, setSortOrder] = useState('dateAsc'); // For event sort
  const [isEventViewModalOpen, setIsEventViewModalOpen] = useState(false); // New state for event view modal
  const [selectedEvent, setSelectedEvent] = useState(null); // New state for selected event details

  // New state to store department ID -> name mapping
  const [departmentNamesMap, setDepartmentNamesMap] = useState({});

  // State to hold the resolved employee data for display
  const [currentEmployee, setCurrentEmployee] = useState(null);

  // State to hold the raw user data from localStorage/API (may contain department ID)
  const [rawLocalStorageUser, setRawLocalStorageUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      return null;
    }
  });

  // Helper functions for formatting dates and times
  const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateInPast = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = dateString.split('-').map(Number);
    const checkDate = new Date(year, month - 1, day);
    return checkDate < today;
  };

  const formatDisplayTime = (timeString) => {
    if (!timeString) return "";
    try {
        let dateObj;
        if (timeString.includes('T') || timeString.includes('Z')) { // ISO string
            dateObj = new Date(timeString);
        } else { // Assume HH:MM format
            const [hours, minutes] = timeString.split(':');
            dateObj = new Date(); // Use current date for time components
            dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        }

        if (isNaN(dateObj.getTime())) {
            console.warn("Invalid date/time string provided to formatTime:", timeString);
            return 'Invalid Time';
        }

        const hour = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;

        return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
    } catch (e) {
        console.error("Error formatting time:", e);
        return 'Error Time';
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateString;
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const getMonthName = (monthIndex) => new Date(2000, monthIndex).toLocaleString('en-US', { month: 'long' });

  // Custom Alert Dialog Function
  const showAlertDialog = (message, isError = false) => {
    setCustomAlertMessage(message);
    setCustomAlertIsError(isError);
    setShowCustomAlert(true);
    // Auto-hide after 3-5 seconds for non-error messages
    if (!isError) {
      setTimeout(() => {
        setShowCustomAlert(false);
        setCustomAlertMessage('');
      }, 3000); // 3 seconds
    }
  };

  const closeAlertDialog = () => {
    setShowCustomAlert(false);
    setCustomAlertMessage('');
  };


  // Check authentication status
  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      console.log('No authentication found, redirecting to login');
      setIsLoggedIn(false);
      setAuthChecked(true);
      return false;
    }

    try {
      const parsedUser = JSON.parse(user);
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
    localStorage.clear();
    setIsLoggedIn(false);
    setCurrentEmployee(null);
    setRawLocalStorageUser(null); // Clear raw user data on logout
    setTasks([]);
    setAttendanceHistory([]);
    setIsClockedIn(false);
    setCurrentAttendanceRecordId(null);
    setHasClockedOutToday(false); // Reset this on logout
    navigate("/login");
  };

  const getApiBaseUrl = () => {
    return localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
  };

  const getTaskEndpoint = () => {
    const storedEndpoint = localStorage.getItem("taskEndpoint");
    if (storedEndpoint) return storedEndpoint;
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/tasks`;
  };

  const getEventEndpoint = () => {
    const storedEndpoint = localStorage.getItem("eventEndpoint");
    if (storedEndpoint) return storedEndpoint;
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/events`;
  };

  // Function to fetch a single department's name by its ID
  const fetchDepartmentNameById = async (departmentId, token, baseUrl) => {
    // Check if the name is already in the map to avoid redundant API calls
    if (departmentNamesMap[departmentId]) {
      return departmentNamesMap[departmentId];
    }
    try {
      const response = await axios.get(`${baseUrl}/department/${departmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      if (response.data && response.data.data && response.data.data.name) {
        const name = response.data.data.name;
        setDepartmentNamesMap(prev => ({ ...prev, [departmentId]: name }));
        return name;
      }
    } catch (err) {
      console.error(`Error fetching department name for ID ${departmentId}:`, err);
    }
    return 'Unknown Department'; // Fallback if fetching fails
  };

  // Enhanced profile fetching
  const fetchEmployeeProfile = async () => {
    if (!checkAuthStatus()) {
      setLoading(false); // Ensure loading is false if auth fails
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) { navigate('/login'); return; }

      const baseUrl = getApiBaseUrl();
      const possibleEndpoints = [
        `${baseUrl}/auth/profile`, `${baseUrl}/user/profile`, `${baseUrl}/employee/profile`,
        `${baseUrl}/auth/me`, `${baseUrl}/me`
      ];

      let fetchedUserData = null; // This will hold the raw data from the API
      let successfulEndpoint = '';

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
          if (response.status >= 200 && response.status < 300 && response.data) {
            fetchedUserData = response.data.user || response.data;
            successfulEndpoint = endpoint;
            break;
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            handleLogout(new Event('click')); return;
          }
        }
      }

      if (fetchedUserData) {
        if (fetchedUserData.status === 'pending') {
          navigate('/employee-pending'); return;
        }

        // Update rawLocalStorageUser state and localStorage
        setRawLocalStorageUser(fetchedUserData);
        localStorage.setItem('user', JSON.stringify(fetchedUserData));
        localStorage.setItem("profileEndpoint", successfulEndpoint);

        const displayedName = (fetchedUserData.name && fetchedUserData.name !== 'Employee')
          ? fetchedUserData.name : (fetchedUserData.username || 'Employee');

        let departmentName = 'General';
        if (typeof fetchedUserData.department === 'object' && fetchedUserData.department !== null) {
            departmentName = fetchedUserData.department.name;
        } else if (typeof fetchedUserData.department === 'string' && fetchedUserData.department) {
            // It's an ID, so we need to fetch the name
            departmentName = await fetchDepartmentNameById(fetchedUserData.department, token, baseUrl);
        }

        const employeeData = {
          id: fetchedUserData.id || fetchedUserData._id,
          name: displayedName,
          email: fetchedUserData.email,
          department: departmentName, // Use the resolved name
          position: fetchedUserData.position || 'Staff',
          username: fetchedUserData.username,
          status: fetchedUserData.status
        };
        setCurrentEmployee(employeeData); // Update the resolved employee data
        setIsLoggedIn(true);
        setLastFetchTime(new Date());
        setError(null);
        console.log("Fetched currentEmployee from API (with resolved department):", employeeData);
      } else {
        setError("Failed to fetch profile information");
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

  // Function to get user's current geolocation
  const getUserGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return null;
    }
    setLoading(true);
    setLocationError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          setLoading(false);
          setLocationError(null);
          resolve({ latitude, longitude });
        },
        (error) => {
          let errorMessage = "An unknown error occurred while getting location.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied. Please allow location access in your browser settings and retry.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable. Please ensure GPS/location services are enabled.";
              break;
            case error.TIMEOUT:
              errorMessage = "The request to get user location timed out. Please try again.";
              break;
            default:
              errorMessage = `An unexpected error occurred: ${error.message || error.code}.`;
              break;
          }
          setLocationError(errorMessage);
          setLoading(false);
          reject(new Error(errorMessage));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Clock-in function
  const handleClockIn = async () => {
    if (!checkAuthStatus()) return;
    // Prevent clock-in if already clocked in or has clocked out today
    if (isClockedIn) {
      showAlertDialog("You are already clocked in.", true);
      return;
    }
    if (hasClockedOutToday) {
      showAlertDialog("You have already clocked out for today. You can only clock in once per day.", true);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) { showAlertDialog("Authentication token not found. Please log in again.", true); navigate('/login'); return; }

      const employeeId = currentEmployee?.id || localStorage.getItem("employeeId");
      if (!employeeId) { showAlertDialog("Employee ID not found. Please log in again.", true); navigate('/login'); return; }

      let locationData = userLocation;
      if (!locationData) {
        try { locationData = await getUserGeolocation(); if (!locationData) { return; } } catch (err) { return; }
      }

      const clockInTime = new Date().toISOString();
      const baseUrl = getApiBaseUrl();
      const attendanceEndpoint = `${baseUrl}/attendance/record`;

      setLoading(true);
      const response = await axios.post(attendanceEndpoint, { employeeId, latitude: locationData.latitude, longitude: locationData.longitude, timeIn: clockInTime }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000
      });

      if (response.status >= 200 && response.status < 300 && response.data.success) {
        const newRecord = response.data.data;
        setIsClockedIn(true);
        setCurrentAttendanceRecordId(newRecord._id || newRecord.id);
        showAlertDialog(`Success: ${response.data.message}${newRecord.isLate ? " (Marked as Late)" : ""}`);
        setLocationError(null);
        await fetchAttendanceHistory(employeeId);
      } else {
        showAlertDialog(`Failed to record clock-in: ${response.data?.message || `Server error: ${response.status}`}`, true);
        setLocationError(response.data?.message);
      }
    } catch (error) {
      let alertMessage = "Failed to record clock-in: An unexpected error occurred.";
      if (error.response?.status === 401) { alertMessage = "Session expired. Please log in again."; handleLogout(new Event('click')); }
      else if (error.response?.status === 403) { alertMessage = error.response.data?.message || "You are not within the allowed workspace to record attendance."; }
      else if (error.request) { alertMessage = "Network error: Unable to connect to server."; }
      else if (error.message) { alertMessage = `Request failed: ${error.message}`; }
      showAlertDialog(alertMessage, true); setLocationError(alertMessage);
    } finally { setLoading(false); }
  };

  // Clock-out function
  const handleClockOut = async () => {
    if (!checkAuthStatus()) return;
    if (!isClockedIn || !currentAttendanceRecordId) { showAlertDialog("You are not currently clocked in.", true); return; }

    try {
      const token = localStorage.getItem("token");
      if (!token) { showAlertDialog("Authentication token not found. Please log in again.", true); navigate('/login'); return; }

      const clockOutTime = new Date().toISOString();
      const baseUrl = getApiBaseUrl();
      const attendanceEndpoint = `${baseUrl}/attendance/update/${currentAttendanceRecordId}`;

      setLoading(true);
      const response = await axios.put(attendanceEndpoint, { timeOut: clockOutTime }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000
      });

      if (response.status >= 200 && response.status < 300 && response.data.success) {
        const updatedRecord = response.data.data;
        setIsClockedIn(false);
        setCurrentAttendanceRecordId(null);
        setHasClockedOutToday(true); // Mark that the user has clocked out today
        showAlertDialog(`Success: ${response.data.message}${updatedRecord.isOvertime ? " (Marked as Overtime)" : ""}`);
        setLocationError(null);
        await fetchAttendanceHistory(currentEmployee.id || localStorage.getItem("employeeId"));
      } else {
        showAlertDialog(`Failed to record clock-out: ${response.data?.message || `Server error: ${response.status}`}`, true);
        setLocationError(response.data?.message);
      }
    } catch (error) {
      let alertMessage = "Failed to record clock-out: An unexpected error occurred.";
      if (error.response?.status === 401) { alertMessage = "Session expired. Please log in again."; handleLogout(new Event('click')); }
      else if (error.request) { alertMessage = "Network error: Unable to connect to server."; }
      else if (error.message) { alertMessage = `Request failed: ${error.message}`; }
      showAlertDialog(alertMessage, true); setLocationError(alertMessage);
    } finally { setLoading(false); }
  };

  const fetchAttendanceHistory = async (employeeId) => {
    if (!checkAuthStatus()) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      setLoading(true);
      const baseUrl = getApiBaseUrl();
      const historyEndpoint = `${baseUrl}/attendance/employee/${employeeId}`;

      const response = await axios.get(historyEndpoint, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });

      if (response.data.success) {
        const fetchedRecords = response.data.data.map(record => {
          const recordTimeIn = record.timeIn ? new Date(record.timeIn) : null;
          const isLateFallback = (recordTimeIn && (recordTimeIn.getHours() < 7 || recordTimeIn.getHours() >= 10));
          const isOvertimeFallback = (record.duration && record.duration > (8 * 60));
          return {
            ...record,
            isLate: record.isLate !== undefined ? record.isLate : isLateFallback,
            isOvertime: record.isOvertime !== undefined ? record.isOvertime : isOvertimeFallback
          };
        });
        setAttendanceHistory(fetchedRecords); setError(null);

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

        let clockedInForToday = false;
        let clockedOutForToday = false;
        let currentRecordId = null;

        // Check records for today
        for (const record of fetchedRecords) {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0); // Normalize record date to start of day

            if (recordDate.getTime() === today.getTime()) {
                if (record.timeIn && (!record.timeOut || record.timeOut === 'N/A')) {
                    clockedInForToday = true;
                    currentRecordId = record._id || record.id;
                    break; // Found an active clock-in for today
                } else if (record.timeIn && record.timeOut && record.timeOut !== 'N/A') {
                    clockedOutForToday = true; // Found a clocked out record for today
                }
            }
        }

        setIsClockedIn(clockedInForToday);
        setCurrentAttendanceRecordId(currentRecordId);
        // If there's a record that's both clocked in and clocked out for today, set hasClockedOutToday to true
        // This ensures the clock-in button is disabled if they've already completed their attendance for the day.
        setHasClockedOutToday(clockedOutForToday && !clockedInForToday);


      } else {
        console.error('Failed to fetch attendance history:', response.data.message);
      }
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      if (error.response?.status === 401) { handleLogout(new Event('click')); }
    } finally { setLoading(false); }
  };

  // Enhanced task fetching
  const fetchEmployeeTasks = async (employeeId, forceRefresh = false) => {
    if (!checkAuthStatus()) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) { console.warn("Authentication token not found"); return; }

      setLoading(true); setError(null);
      const timestamp = new Date().getTime();
      const taskEndpoint = getTaskEndpoint();
      const urlWithParams = `${taskEndpoint}?_t=${timestamp}&refresh=${forceRefresh ? '1' : '0'}`;

      const response = await axios.get(urlWithParams, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        timeout: 15000, validateStatus: (status) => status < 500
      });

      if (response.status >= 200 && response.status < 300) {
        let allTasks = Array.isArray(response.data) ? response.data :
                       (response.data?.tasks && Array.isArray(response.data.tasks)) ? response.data.tasks :
                       (response.data?.data && Array.isArray(response.data.data)) ? response.data.data :
                       (response.data && typeof response.data === 'object' && Object.values(response.data).find(val => Array.isArray(val))) || [];

        const activeTasks = allTasks.filter(task => !task.deleted && !task.isDeleted && task.status !== 'deleted' && task.active !== false);

        if (activeTasks.length === 0) { setTasks([]); setLastFetchTime(new Date().toLocaleTimeString()); return; }

        if (!employeeId || employeeId === "fallback-employee-id") { setTasks(activeTasks); }
        else {
          const employeeTasks = activeTasks.filter(task => {
            const taskAssignedTo = task.assignedTo || task.assigned_to || task.employeeId || task.employee_id || task.employee?.id || task.employee?._id;
            return taskAssignedTo && taskAssignedTo.toString() === employeeId.toString();
          });
          setTasks(employeeTasks.length > 0 ? employeeTasks : activeTasks);
        }
        setLastFetchTime(new Date().toLocaleTimeString()); setError(null);
      } else if (response.status === 401) { setError("Authentication failed - please log in again"); handleLogout(new Event('click')); }
      else { setError(`Failed to fetch tasks: ${response.status}`); setTasks([]); }
    } catch (err) {
      console.error("Error fetching employee tasks:", err);
      if (err.code === 'ECONNABORTED') { setError("Request timeout - please try again"); }
      else if (err.response?.status === 401) { setError("Authentication failed - please log in again"); handleLogout(new Event('click')); }
      else if (err.response?.status >= 500) { setError("Server error - please try again later"); }
      else { setError("Failed to fetch tasks - check your connection"); }
      if (err.response?.status !== 401) { /* Keep existing tasks on non-auth errors */ } else { setTasks([]); }
    } finally { setLoading(false); }
  };

  // Fetch events from API
  const fetchEvents = async () => {
    setLoading(true);
    setEventErrorMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setEventErrorMessage("Authentication token not found. Please log in.");
        setLoading(false);
        return;
      }

      const baseUrl = getApiBaseUrl();
      const possibleEndpoints = [`${baseUrl}/events`, `${baseUrl}/calendar/events`];

      let fetchedData = null;
      let success = false;

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000
          });

          if (response.status >= 200 && response.status < 300) {
            fetchedData = response.data.events || response.data.data || response.data;
            success = true;
            localStorage.setItem("eventEndpoint", endpoint);
            break;
          }
        } catch (err) {
          console.warn(`Failed to fetch from ${endpoint}:`, err.message);
        }
      }

      if (success && fetchedData && Array.isArray(fetchedData)) {
        const processedEvents = fetchedData
          .filter(event => event.visibility === 'public')
          .map(event => ({
            ...event,
            date: event.date?.split('T')[0] || '',
            startTime: event.startTime || event.time || '00:00',
            endTime: event.endTime || '', // Ensure endTime is captured
            id: event.id || event._id || Math.random().toString(36).substr(2, 9),
            link: event.link || '',
            location: event.location || '',
            visibility: event.visibility || 'public',
            type: event.type || 'other',
          }));
        setEvents(processedEvents);
      } else {
        setEventErrorMessage("Failed to fetch events from all known endpoints or data format is incorrect.");
        setEvents([]);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      setEventErrorMessage("An unexpected error occurred while fetching events.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle file input change for completed file
  const handleCompletedFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setCompletedFile(file); } else { setCompletedFile(null); }
  };

  // Upload file to Cloudinary
  const uploadFileToCloudinary = async (file) => {
    if (!file) return null;
    setUploadingCompletedFile(true);
    const token = localStorage.getItem("token");
    if (!token) { showAlertDialog("Authentication token not found. Please log in first.", true); setUploadingCompletedFile(false); return null; }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${getApiBaseUrl()}/files/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 60000
      });
      if (response.status >= 200 && response.status < 300) { setError(null); return response.data.url; }
      else { setError(`File upload failed: ${response.data.message || response.statusText}`); return null; }
    } catch (err) {
      setError(`File upload network error: ${err.message}`); return null;
    } finally { setUploadingCompletedFile(false); }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (currentEmployee) {
      await fetchEmployeeTasks(currentEmployee.id || currentEmployee._id, true);
      await fetchAttendanceHistory(currentEmployee.id || currentEmployee._id);
      await fetchEvents();
    }
  };

  // Helper function to get Cloudinary download link
  const getDownloadLink = (fileUrl) => {
    if (!fileUrl) return '#';
    // Check if it's a Cloudinary URL
    if (fileUrl.includes('res.cloudinary.com')) {
      // Example Cloudinary URL: https://res.cloudinary.com/cloud_name/image/upload/v12345/path/to/file.ext
      // We want to insert fl_attachment/ after /upload/
      const parts = fileUrl.split('/upload/');
      if (parts.length === 2) {
        return `${parts[0]}/upload/fl_attachment/${parts[1]}`;
      }
    }
    // For non-Cloudinary URLs or if parsing fails, return the original URL
    return fileUrl;
  };

  // Update task status, including file upload for completion
  const updateTaskStatus = async (taskId, newStatus) => {
    if (!checkAuthStatus()) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) { showAlertDialog("Authentication token not found. Please log in first.", true); navigate('/login'); return; }

      const taskToUpdate = tasks.find(task => (task.id && task.id.toString() === taskId.toString()) || (task._id && task._id.toString() === taskId.toString()));
      if (!taskToUpdate) { console.error("Task not found with ID:", taskId); return; }

      let fileUrl = null;
      if (newStatus === 'completed' && completedFile) {
        fileUrl = await uploadFileToCloudinary(completedFile);
        if (!fileUrl) { setError("Failed to upload completion file. Task status not updated."); return; }
      }

      const updateData = {
        status: newStatus, updatedAt: new Date().toISOString(), completedFile: fileUrl || taskToUpdate.completedFile,
        title: taskToUpdate.title, description: taskToUpdate.description, priority: taskToUpdate.priority,
        deadline: taskToUpdate.deadline, assignedTo: taskToUpdate.assignedTo || taskToUpdate.assigned_to || taskToUpdate.employeeId
      };

      setTasks(prevTasks =>
        prevTasks.map(task => {
          const taskMatch = (task.id && task.id.toString() === taskId.toString()) || (task._id && task._id.toString() === taskId.toString());
          return taskMatch ? { ...task, status: newStatus, completedFile: updateData.completedFile, updatedAt: new Date().toISOString() } : task;
        })
      );

      const baseEndpoint = getTaskEndpoint();
      const possibleEndpoints = [`${baseEndpoint}/${taskId}`, `${baseEndpoint}/update/${taskId}`, `${baseEndpoint}/${taskId}/status`, `${baseEndpoint}/${taskId}/update`];

      let updateSuccess = false;
      let lastError = null;

      for (const endpoint of possibleEndpoints) {
        for (const method of ['put', 'patch']) {
          try {
            const response = await axios[method](endpoint, updateData, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
            if (response.status >= 200 && response.status < 300) {
              updateSuccess = true;
              if (response.data && (response.data.task || response.data.id || response.data._id)) {
                const serverTask = response.data.task || response.data;
                setTasks(prevTasks => prevTasks.map(task => {
                  const taskMatch = (task.id && task.id.toString() === taskId.toString()) || (task._id && task._id.toString() === taskId.toString());
                  return taskMatch ? { ...task, ...serverTask } : task;
                }));
              }
              break;
            }
          } catch (err) { lastError = err; if (err.response && err.response.status === 401) { throw err; } }
        }
        if (updateSuccess) break;
      }

      if (!updateSuccess) { throw lastError || new Error("All update methods failed"); }

      showAlertDialog(`Task marked as ${newStatus.replace('-', ' ')}`);
      setCompletedFile(null);
      setShowCompletionModal(false);
      setTaskToComplete(null);
      setTimeout(() => { if (currentEmployee) { fetchEmployeeTasks(currentEmployee.id || currentEmployee._id, true); } }, 1000);

    } catch (err) {
      console.error("Error updating task:", err);
      const originalTask = tasks.find(task => (task.id && task.id.toString() === taskId.toString()) || (task._id && task._id.toString() === taskId.toString()));
      if (originalTask) { setTasks(prevTasks => prevTasks.map(task => (task.id && task.id.toString() === taskId.toString()) || (task._id && task._id.toString() === taskId.id.toString()) ? originalTask : task)); }

      if (err.response?.status === 403) { showAlertDialog("You don't have permission to update this task.", true); }
      else if (err.response?.status === 404) { showAlertDialog("Task not found or update endpoint not available.", true); }
      else if (err.response?.status === 401) { showAlertDialog("Session expired. Please log in again.", true); handleLogout(new Event('click')); }
      else if (err.response?.status === 422) { showAlertDialog(`Invalid data: ${err.response?.data?.message || 'Please check the task data'}`, true); }
      else if (err.code === 'ECONNABORTED') { showAlertDialog("Request timeout. Please try again.", true); }
      else { showAlertDialog(`Failed to update task: ${err.response?.data?.message || err.message || 'Unknown error occurred'}`, true); }
    }
  };

  // Modal handlers for task details
  const handleOpenModal = (task) => { setSelectedTask(task); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedTask(null); };

  // Modal handlers for completion
  const handleOpenCompletionModal = (task) => { setTaskToComplete(task); setCompletedFile(null); setShowCompletionModal(true); };
  const handleCloseCompletionModal = () => { setShowCompletionModal(false); setTaskToComplete(null); setCompletedFile(null); };
  const handleConfirmCompletion = () => { if (taskToComplete) { updateTaskStatus(taskToComplete._id || taskToComplete.id, 'completed'); } };

  // Modal handlers for event details
  const handleOpenEventViewModal = (event) => { setSelectedEvent(event); setIsEventViewModalOpen(true); };
  const handleCloseEventViewModal = () => { setIsEventViewModalOpen(false); setSelectedEvent(null); };


  // Sort tasks: Incomplete first, then by deadline
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Optimized: Pre-process events into a map for faster lookup in renderCalendarDays
  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      const eventDate = event.date?.split('T')[0] || '';
      if (eventDate) {
        if (!map.has(eventDate)) { map.set(eventDate, []); }
        map.get(eventDate).push(event);
      }
    });
    return map;
  }, [events]);

  // Filter and sort events based on search query and sort order
  const filteredEvents = useMemo(() => {
    let tempEvents = events.filter(event =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    switch (sortOrder) {
      case 'dateAsc':
        tempEvents.sort((a, b) => new Date(a.date + 'T' + (a.startTime || '00:00')) - new Date(b.date + 'T' + (b.startTime || '00:00')));
        break;
      case 'dateDesc':
        tempEvents.sort((a, b) => new Date(b.date + 'T' + (b.startTime || '00:00')) - new Date(a.date + 'T' + (a.startTime || '00:00')));
        break;
      case 'titleAsc':
        tempEvents.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'titleDesc':
        tempEvents.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        break;
    }
    return tempEvents;
  }, [events, searchQuery, sortOrder]);


  // Calendar rendering logic
  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const numDays = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);

    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 w-full"></div>);
    }

    for (let day = 1; day <= numDays; day++) {
      const fullDate = formatDateToYYYYMMDD(new Date(year, month, day));
      const isToday = fullDate === formatDateToYYYYMMDD(new Date());
      const isInPast = isDateInPast(fullDate);

      const eventsForDay = eventsByDate.get(fullDate) || [];

      days.push(
        <div
          key={day}
          className={`relative h-28 p-2 border rounded-lg flex flex-col items-start transition-all duration-200
            ${isToday ? 'bg-green-100 border-green-500' : 'bg-white hover:bg-gray-50'}
            ${isInPast && !isToday ? 'bg-gray-100 text-gray-400' : ''}
            ${eventsForDay.length > 0 ? 'bg-emerald-50 border-emerald-300' : ''}
            border-gray-200 shadow-sm overflow-hidden cursor-pointer
          `}
          onClick={() => {
            // If there are events, open a modal to show them
            if (eventsForDay.length > 0) {
              setSelectedEvent(eventsForDay[0]); // Select the first event for display
              setIsEventViewModalOpen(true);
            }
          }}
        >
          <span className={`text-lg font-semibold mb-1 ${isToday ? 'text-green-700' : ''}`}>
            {day}
          </span>
          {eventsForDay.length > 0 && (
            <div className="flex flex-col gap-0.5 overflow-hidden w-full text-xs">
              {eventsForDay.slice(0, 2).map(event => ( // Show up to 2 events directly
                <div
                  key={event.id || event._id}
                  className="bg-emerald-200 text-emerald-800 rounded-full px-2 py-0.5 truncate max-w-full hover:bg-emerald-300 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening the date's default action
                    setSelectedEvent(event);
                    setIsEventViewModalOpen(true);
                  }}
                  title={`${event.title} (${formatDisplayTime(event.startTime)})`}
                >
                  {event.title}
                </div>
              ))}
              {eventsForDay.length > 2 && (
                <span className="text-gray-500 ml-1">+{eventsForDay.length - 2} more</span>
              )}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };


  // Effect hooks
  useEffect(() => {
    if (!authChecked) {
      checkAuthStatus();
    }
  }, [authChecked]);

  useEffect(() => {
    // Only fetch profile if not already loaded or if the department needs resolving
    // This condition ensures fetchEmployeeProfile runs only when necessary.
    if (authChecked && isLoggedIn && (!currentEmployee || (rawLocalStorageUser?.department && typeof rawLocalStorageUser.department === 'string' && !departmentNamesMap[rawLocalStorageUser.department]))) {
      fetchEmployeeProfile();
    }
  }, [authChecked, isLoggedIn, rawLocalStorageUser, departmentNamesMap]); // Depend on rawLocalStorageUser and departmentNamesMap to trigger resolution

  useEffect(() => {
    if (currentEmployee && isLoggedIn) {
      fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
      fetchAttendanceHistory(currentEmployee.id || currentEmployee._id);
      fetchEvents();

      const refreshInterval = setInterval(() => {
        fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
        fetchAttendanceHistory(currentEmployee.id || currentEmployee._id);
        fetchEvents();
      }, 120000);

      return () => clearInterval(refreshInterval);
    }
  }, [currentEmployee, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'attendance' && !userLocation && !locationError) {
      getUserGeolocation().catch(err => console.log("Initial geolocation fetch failed:", err.message));
    }
  }, [isLoggedIn, userLocation, locationError, activeTab]);


  if (!authChecked || (loading && !currentEmployee)) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 font-inter">
        <div className="text-xl text-green-700">Loading Dashboard...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-inter" onClick={closeProfileDropdown}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-green-900 shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center cursor-pointer">
            <h1 className="text-2xl text-white font-bold" onClick={() => window.location.href = "/"}>
              OfficeCorner
            </h1>
            {/* Department Name Display in Header */}
            {currentEmployee?.department && currentEmployee.department !== 'General' && (
              <span className="ml-4 bg-green-700 text-blue-100 text-sm font-semibold px-3 py-1 rounded-full shadow-inner">
                Department: {currentEmployee.department.toUpperCase()}
              </span>
            )}
          </div>
          <div className="hidden md:flex items-center text-white text-sm mr-6">
            <Calendar className="h-4 w-4 mr-2" />
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
                    {currentEmployee?.position || 'Staff'} - <span className="font-semibold text-green-700">{currentEmployee?.department || 'General'}</span>
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
                  <LogOut className="mr-3" size={20} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Changed overflow-x-auto to overflow-hidden */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {/* Adjusted sidebar classes: remove 'fixed' and 'h-full', add 'absolute inset-y-0 left-0' for mobile */}
        <aside className={`min-h-screen bg-green-800 text-white w-64 p-5 space-y-6 flex flex-col justify-between ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out absolute md:relative inset-y-0 left-0 z-40`}>
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
                    <CalendarIconLucide className="mr-3" size={20} /> Calendar
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab('attendance')} className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 ${activeTab === 'attendance' ? 'bg-green-700 text-white' : 'hover:bg-green-700 hover:text-white'}`} >
                    <MousePointerClick className="mr-3" size={20} /> Attendance
                  </button>
                </li>
              </ul>
            </nav>
          </div>
          <div className="mt-auto">
            <p className="text-sm text-green-300 mb-2">Last Fetched: {lastFetchTime ? formatDateDisplay(lastFetchTime) : 'N/A'}</p>
            <button onClick={handleManualRefresh} className="w-full flex items-center justify-center p-3 rounded-lg bg-green-700 text-white hover:bg-green-600 transition-colors duration-200" >
              <RefreshCw size={18} className="mr-2" /> Refresh Data
            </button>
            <Link to="/login" onClick={handleLogout} className="w-full text-left flex items-center p-3 mt-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200" >
              <LogOut className="mr-3" size={20} /> Logout
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        {/* Changed 'overflow-x-hidden' to 'overflow-y-auto' and added 'flex-grow' */}
        <main className="flex-grow overflow-y-auto bg-gray-100 p-6 min-w-0">
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
              {loading && <p className="text-gray-500">Loading tasks...</p>}
              {!loading && sortedTasks.length === 0 && <p className="text-gray-600">No tasks assigned.</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedTasks.map((task) => (
                  <div key={task._id || task.id} className="bg-green-50 p-5 rounded-lg shadow-sm border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">{task.title}</h3>
                    <p className="text-sm text-gray-700 mb-3">{task.description}</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong className="text-green-700">Deadline:</strong> {formatDateDisplay(task.deadline)}</p>
                      <p><strong className="text-green-700">Priority:</strong> {task.priority}</p>
                      <p><strong className="text-green-700">Status:</strong> <span className={`font-medium ${task.status === 'completed' ? 'text-green-500' : 'text-yellow-600'}`}>{task.status}</span></p>
                      {/* New: Task Given Date */}
                      {task.createdAt && (
                        <p><strong className="text-green-700">Task Given:</strong> {formatDateDisplay(task.createdAt)}</p>
                      )}
                      {task.assignedFile && (
                        <p className="flex items-center">
                          <Paperclip className="mr-1 text-blue-500" size={16} />
                          <strong className="text-green-700">Assigned File:</strong>{" "}
                          {/* Updated to use getDownloadLink for assigned files */}
                          <a href={getDownloadLink(task.assignedFile)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">Download File</a>
                        </p>
                      )}
                      {task.completedFile && (
                        <p className="flex items-center">
                          <CheckCircle className="mr-1 text-emerald-500" size={16} />
                          <strong className="text-green-700">Completed File:</strong>{" "}
                          <a href={task.completedFile} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline ml-1">View File</a>
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() => handleOpenModal(task)}
                        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 text-sm"
                      >
                        <Eye className="mr-1" size={16} /> View Details
                      </button>
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => handleOpenCompletionModal(task)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors duration-200 text-sm flex items-center"
                        >
                          <Check className="mr-1" size={16} /> Mark as Complete
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
              <h2 className="text-3xl font-bold text-green-800 mb-6 border-b-2 border-green-200 pb-3">Company Events Calendar</h2>
              {eventErrorMessage && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{eventErrorMessage}</div>}

              {/* Calendar Header */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={handlePrevMonth} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-300 transition-colors">
                    &lt; Prev
                  </button>
                  <h2 className="text-2xl font-semibold text-gray-800">
                    {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
                  </h2>
                  <button onClick={handleNextMonth} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-300 transition-colors">
                    Next &gt;
                  </button>
                </div>

                {/* Days of the Week */}
                <div className="grid grid-cols-7 gap-2 text-center font-medium text-gray-600 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2">{day}</div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {renderCalendarDays()}
                </div>
              </div>

              {/* Event List Section */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                  <h2 className="text-xl font-semibold text-green-800">Upcoming Public Events</h2>
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border border-gray-300 p-2 rounded-md focus:ring-green-500 focus:border-green-500 w-full sm:w-auto"
                    />
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="border border-gray-300 p-2 rounded-md focus:ring-green-500 focus:border-green-500 w-full sm:w-auto"
                    >
                      <option value="dateAsc">Date (Asc)</option>
                      <option value="dateDesc">Date (Desc)</option>
                      <option value="titleAsc">Title (Asc)</option>
                      <option value="titleDesc">Title (Desc)</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading events...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No upcoming public events.</div>
                ) : (
                  <div className="space-y-4">
                    {filteredEvents.map(event => (
                      <div
                        key={event.id || event._id}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-lg transition cursor-pointer"
                        onClick={() => handleOpenEventViewModal(event)}
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-600">{event.description}</p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <CalendarIconLucide size={14} className="mr-1" />
                            {formatDateDisplay(event.date)}
                            <Clock size={14} className="ml-3 mr-1" />
                            {formatDisplayTime(event.startTime)} {event.endTime && ` - ${formatDisplayTime(event.endTime)}`}
                            {event.location && (
                              <>
                                <MapPin size={14} className="ml-3 mr-1" />
                                {event.location}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-0 flex flex-wrap gap-2">
                          {event.link && (
                            <a
                              href={event.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-200 flex items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link2 className="mr-1" size={14} /> View Link
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Attendance Section */}
          {activeTab === 'attendance' && (
            <section className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-3xl font-bold text-green-800 mb-6 border-b-2 border-green-200 pb-3">My Attendance</h2>
              <div className="flex justify-start mb-6 gap-4">
                {!isClockedIn && !hasClockedOutToday ? ( // Disable clock-in if already clocked out today
                  <button
                    onClick={handleClockIn}
                    className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition-colors duration-200 text-lg font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    disabled={loading || hasClockedOutToday}
                  >
                    <LogIn size={20} className="mr-2" />
                    {loading ? 'Getting Location...' : 'Clock In'}
                  </button>
                ) : (
                  <button
                    onClick={handleClockOut}
                    className="bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 text-lg font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    disabled={loading || !isClockedIn} // Disable clock-out if not clocked in
                  >
                    <LogOut size={20} className="mr-2" />
                    {loading ? 'Processing Clock-out...' : 'Clock Out'}
                  </button>
                )}
                {hasClockedOutToday && !isClockedIn && (
                    <p className="text-red-500 font-medium self-center">You have already clocked out for today.</p>
                )}
              </div>

              {locationError && (
                <div className="bg-red-50 border border-red-500 text-red-700 px-4 py-3 rounded-lg relative mb-4 flex flex-col md:flex-row items-start md:items-center justify-between" role="alert">
                  <div className="flex items-start">
                    <MapPin className="text-red-600 mr-3 mt-1 md:mt-0" size={20} />
                    <div>
                      <strong className="font-bold">Location Error:</strong>
                      <span className="block sm:inline"> {locationError}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => getUserGeolocation().catch(err => console.log("Retry geolocation failed:", err.message))}
                    className="mt-3 md:mt-0 md:ml-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 text-sm flex items-center"
                  >
                    <RefreshCw size={16} className="mr-2" /> Retry Location
                  </button>
                </div>
              )}

              {loading && <p className="text-gray-500">Loading attendance history...</p>}
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
                        <th className="py-3 px-6 text-left">Info</th>
                        <th className="py-3 px-6 text-left">Location</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm font-light">
                      {attendanceHistory.map((record, index) => (
                        <tr key={record._id || record.id || index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-6 text-left whitespace-nowrap">{formatDateDisplay(record.date)}</td>
                          <td className="py-3 px-6 text-left">{formatDisplayTime(record.timeIn)}</td>
                          <td className="py-3 px-6 text-left">{formatDisplayTime(record.timeOut)}</td>
                          <td className="py-3 px-6 text-left">
                            <span className={`py-1 px-3 rounded-full text-xs font-medium ${
                              record.status === 'Present' ? 'bg-green-200 text-green-800' :
                              record.status === 'Absent' ? 'bg-red-200 text-red-800' :
                              'bg-yellow-200 text-yellow-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-left">
                            {record.isLate && <span className="py-1 px-3 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-1">Late</span>}
                            {record.isOvertime && <span className="py-1 px-3 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Overtime</span>}
                            {!record.isLate && !record.isOvertime && record.status === 'Present' && 'On Time'}
                          </td>
                          <td className="py-3 px-6 text-left">
                            {record.latitude && record.longitude
                              ? `Lat: ${record.latitude.toFixed(4)}, Lon: ${record.longitude.toFixed(4)}`
                              : (record.location || 'N/A')}
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
              <p className="flex items-center"><strong className="w-20 text-green-700">Deadline:</strong> {formatDateDisplay(selectedTask.deadline)}</p>
              <p className="flex items-center"><strong className="w-20 text-green-700">Priority:</strong> {selectedTask.priority}</p>
              <p className="flex items-center"><strong className="w-20 text-green-700">Status:</strong> {selectedTask.status}</p>
              {/* New: Task Given Date in Task Details Modal */}
              {selectedTask.createdAt && (
                <p className="flex items-center"><strong className="w-20 text-green-700">Task Given:</strong> {formatDateDisplay(selectedTask.createdAt)}</p>
              )}
              {selectedTask.assignedFile && (
                <p className="flex items-center"><strong className="w-20 text-green-700">Assigned File:</strong>{" "}
                  {/* Updated to use getDownloadLink for assigned files in modal */}
                  <a href={getDownloadLink(selectedTask.assignedFile)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Download File</a>
                </p>
              )}
              {selectedTask.completedFile && (
                <p className="flex items-center"><strong className="w-20 text-green-700">Completed File:</strong>{" "}
                  <a href={selectedTask.completedFile} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">View File</a>
                </p>
              )}
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

      {/* Task Completion Modal */}
      {showCompletionModal && taskToComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={handleCloseCompletionModal}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-2xl font-bold"
            >
              &times;
            </button>
            <h3 className="text-2xl font-semibold mb-6 text-green-900 border-b-2 border-green-300 pb-2">Mark Task as Completed</h3>
            <div className="space-y-4 text-sm text-gray-800">
              <p><strong className="text-green-700">Task:</strong> {taskToComplete.title}</p>
              <p><strong className="text-green-700">Description:</strong> {taskToComplete.description}</p>

              {/* File Upload for Completion */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Completion File (Optional)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    id="completedFileInput"
                    className="hidden"
                    onChange={handleCompletedFileChange}
                  />
                  <label
                    htmlFor="completedFileInput"
                    className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center hover:bg-blue-600 transition-colors duration-200"
                  >
                    <Upload className="mr-2" size={16} /> Choose File
                  </label>
                  {completedFile && (
                    <div className="flex items-center text-slate-700">
                      <span>{completedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCompletedFile(null);
                          document.getElementById('completedFileInput').value = '';
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}
                  {uploadingCompletedFile && (
                    <span className="text-blue-500 text-sm">Uploading...</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">Max 5MB. Allowed: images, PDFs, Word, Excel, PowerPoint, text files.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCloseCompletionModal}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCompletion}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploadingCompletedFile}
              >
                {uploadingCompletedFile ? 'Uploading & Completing...' : 'Confirm Completion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details View Modal for Employee Dashboard */}
      {isEventViewModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={handleCloseEventViewModal}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-2xl font-bold"
            >
              &times;
            </button>
            <h3 className="text-2xl font-semibold mb-6 text-green-900 border-b-2 border-green-300 pb-2">Event Details</h3>
            <div className="space-y-4 text-sm text-gray-800">
              <p className="flex items-center"><strong className="w-24 text-green-700">Title:</strong> {selectedEvent.title}</p>
              <p className="flex items-center"><strong className="w-24 text-green-700">Description:</strong> {selectedEvent.description}</p>
              <p className="flex items-center"><CalendarIconLucide size={16} className="mr-2 text-green-700" />
                <strong className="w-24 text-green-700">Date:</strong> {formatDateDisplay(selectedEvent.date)}
              </p>
              <p className="flex items-center"><Clock size={16} className="mr-2 text-green-700" />
                <strong className="w-24 text-green-700">Time:</strong> {formatDisplayTime(selectedEvent.startTime)} {selectedEvent.endTime && ` - ${formatDisplayTime(selectedEvent.endTime)}`}
              </p>
              <p className="flex items-center"><MapPin size={16} className="mr-2 text-green-700" />
                <strong className="w-24 text-green-700">Location:</strong> {selectedEvent.location || 'N/A'}
              </p>
              <p className="flex items-center"><strong className="w-24 text-green-700">Type:</strong> {selectedEvent.type}</p>
              <p className="flex items-center"><strong className="w-24 text-green-700">Visibility:</strong> {selectedEvent.visibility}</p>
              {selectedEvent.link && (
                <p className="flex items-center">
                  <Link2 size={16} className="mr-2 text-green-700" />
                  <strong className="w-24 text-green-700">Link:</strong>{" "}
                  <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Event Link</a>
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseEventViewModal}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Dialog */}
      {showCustomAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-lg w-full max-w-sm p-6 relative
              ${customAlertIsError ? 'bg-red-50 border border-red-500 text-red-700' : 'bg-green-50 border border-green-500 text-green-700'}`}
            role="alert"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-semibold ${customAlertIsError ? 'text-red-800' : 'text-green-800'}`}>
                {customAlertIsError ? 'Error!' : 'Success!'}
              </h3>
              <button
                onClick={closeAlertDialog}
                className={`text-2xl font-bold ${customAlertIsError ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
              >
                &times;
              </button>
            </div>
            <p className="text-base">{customAlertMessage}</p>
            {!customAlertIsError && ( // Show close button only for error messages, success messages auto-close
              <div className="mt-4 flex justify-end">
                <button
                  onClick={closeAlertDialog}
                  className={`px-4 py-2 rounded-md transition-colors duration-200
                    ${customAlertIsError ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                >
                  Okay
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
