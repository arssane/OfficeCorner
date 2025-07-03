import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { MousePointerClick, Download, DollarSign, Calculator, LogIn, LogOut, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminAttendanceTracking = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]); // New state for departments
  const [filteredEmployees, setFilteredEmployees] = useState([]); // State for searchable employees
  const [searchQuery, setSearchQuery] = useState(""); // State for search query
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:5000/api");
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  // New state to control the visibility of the employee search dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDepartmentForReport, setSelectedDepartmentForReport] = useState(''); // New state for department filter

  const [payrollData, setPayrollData] = useState({
    totalHours: 0,
    totalPay: 0,
    overtimeHours: 0,
    regularHours: 0,
    overtimePay: 0,
    regularPay: 0
  });
  const [payrollSettings, setPayrollSettings] = useState({
    regularRate: 45, // Default $45/hour
    overtimeRate: 67.5, // 1.5x regular rate for weekly overtime
    regularHoursLimit: 40, // 40 hours per week before weekly overtime
    dailyRegularHoursLimit: 8, // 8 hours per day before daily overtime
    dailyOvertimeRatePerMinute: 1.1 // $1.1/minute for daily overtime
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
    endDate: new Date().toISOString().split('T')[0], // Today
  });
  const [manualAttendance, setManualAttendance] = useState({
    employeeId: "",
    date: new Date().toISOString().split('T')[0],
    timeIn: "",
    timeOut: "",
    status: "Present"
  });

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentAttendanceRecordId, setCurrentAttendanceRecordId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Authentication and Logout Utilities
  const checkAuthStatus = useCallback(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      console.log('No authentication found, redirecting to login');
      return false;
    }
    return true;
  }, []);

  const handleLogout = useCallback((e) => {
    e.preventDefault();
    console.log("Logout clicked");
    localStorage.clear();
    setEmployees([]);
    setAttendanceRecords([]);
    setSelectedEmployee(null);
    setIsClockedIn(false);
    setCurrentAttendanceRecordId(null);
    setUserLocation(null);
    setLocationError(null);
    navigate("/login");
  }, [navigate]);

  // Get API configuration
  const getApiBaseUrl = useCallback(() => {
    return localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
  }, []);

  const getDepartmentEndpoint = useCallback(() => { // New function for department endpoint
    const storedEndpoint = localStorage.getItem("departmentEndpoint");
    // Prioritize /departments over /department for fetching all
    return storedEndpoint || `${getApiBaseUrl()}/departments`;
  }, [getApiBaseUrl]);

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

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString || dateString === '-' || dateString === 'null') {
      return 'N/A';
    }
    try {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) {
        console.warn("Invalid date string provided to formatTime:", dateString);
        return 'Invalid Time';
      }
      const options = { hour: '2-digit', minute: '2-digit', hour12: true };
      return dateObj.toLocaleTimeString(undefined, options);
    } catch (e) {
      console.error("Error formatting time:", e);
      return 'Error Time';
    }
  };

  // Function to get user's current geolocation
  const getUserGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Please update or use a different browser.");
      return null;
    }

    setIsLoading(true);
    setLocationError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          setIsLoading(false);
          setLocationError(null);
          resolve({ latitude, longitude });
        },
        (error) => {
          console.error("Error getting geolocation:", error);
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
          setIsLoading(false);
          reject(new Error(errorMessage));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  // Clock-in function
  const handleClockIn = async () => {
    if (!checkAuthStatus()) return;
    if (!selectedEmployee) {
      setError("Please select an employee to clock in.");
      return;
    }
    if (isClockedIn) {
      setError(`${selectedEmployee.name} is already clocked in.`);
      return;
    }

    try {
      console.log(`Admin initiating clock-in for ${selectedEmployee.name}`);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        handleLogout(new Event('click'));
        return;
      }

      let locationData = userLocation;
      if (!locationData) {
        try {
          locationData = await getUserGeolocation();
          if (!locationData) {
            setError("Could not get admin's location for clock-in record.");
            return;
          }
        } catch (err) {
          setError(`Failed to get location: ${err.message}`);
          return;
        }
      }

      const currentTime = new Date();
      const clockInTime = currentTime.toISOString();

      const baseUrl = getApiBaseUrl();
      const attendanceEndpoint = `${baseUrl}/attendance/record`;

      const requestData = {
        employeeId: selectedEmployee._id,
        latitude: locationData.latitude,
        longitude: locationData.longitude, // Corrected: should be longitude
        timeIn: clockInTime,
      };

      setIsLoading(true);

      const response = await axios.post(attendanceEndpoint, requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status >= 200 && response.status < 300 && response.data.success) {
        console.log("Clock-in recorded successfully for selected employee");
        const newRecord = response.data.data;
        setIsClockedIn(true);
        setCurrentAttendanceRecordId(newRecord._id || newRecord.id);
        setError(`Success: ${selectedEmployee.name} clocked in!`);
        setLocationError(null);
        fetchEmployeeAttendance(selectedEmployee._id);
      } else {
        console.error("Server returned unsuccessful response or non-2xx status:", response);
        const errorMessage = response.data?.message || `Server error: ${response.status} ${response.statusText}`;
        setError(`Failed to record clock-in for ${selectedEmployee.name}: ${errorMessage}`);
        setLocationError(errorMessage);
      }

    } catch (error) {
      console.error("Error recording clock-in:", error);
      let alertMessage = "Failed to record clock-in for selected employee: An unexpected error occurred.";
      if (error.response?.status === 401) {
        alertMessage = "Session expired. Please log in again.";
        handleLogout(new Event('click'));
      } else if (error.response?.status === 403) {
        alertMessage = error.response.data?.message || "Not authorized to record attendance.";
      } else if (error.request) {
        alertMessage = "Network error: Unable to connect to server. Check your internet connection.";
      } else if (error.message) {
        alertMessage = `Request failed: ${error.message}`;
      }
      setError(alertMessage);
      setLocationError(alertMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Clock-out function
  const handleClockOut = async () => {
    if (!checkAuthStatus()) return;
    if (!selectedEmployee) {
      setError("Please select an employee to clock out.");
      return;
    }
    if (!isClockedIn || !currentAttendanceRecordId) {
      setError(`${selectedEmployee.name} is not currently clocked in.`);
      return;
    }

    try {
      console.log(`Admin initiating clock-out for ${selectedEmployee.name}`);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        handleLogout(new Event('click'));
        return;
      }

      const currentTime = new Date();
      const clockOutTime = currentTime.toISOString();

      const baseUrl = getApiBaseUrl();
      const attendanceEndpoint = `${baseUrl}/attendance/update/${currentAttendanceRecordId}`;

      const requestData = {
        timeOut: clockOutOutTime,
      };

      setIsLoading(true);

      const response = await axios.put(attendanceEndpoint, requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status >= 200 && response.status < 300 && response.data.success) {
        console.log("Clock-out recorded successfully for selected employee");
        setIsClockedIn(false);
        setCurrentAttendanceRecordId(null);
        setError(`Success: ${selectedEmployee.name} clocked out!`);
        setLocationError(null);
        fetchEmployeeAttendance(selectedEmployee._id);
      } else {
        console.error("Server returned unsuccessful response or non-2xx status:", response);
        const errorMessage = response.data?.message || `Server error: ${response.status} ${response.statusText}`;
        setError(`Failed to record clock-out for ${selectedEmployee.name}: ${errorMessage}`);
        setLocationError(errorMessage);
      }

    } catch (error) {
      console.error("Error recording clock-out:", error);
      let alertMessage = "Failed to record clock-out for selected employee: An unexpected error occurred.";
      if (error.response?.status === 401) {
        alertMessage = "Session expired. Please log in again.";
        handleLogout(new Event('click'));
      } else if (error.request) {
        alertMessage = "Network error: Unable to connect to server. Check your internet connection.";
      } else if (error.message) {
        alertMessage = `Request failed: ${error.message}`;
      }
      setError(alertMessage);
      setLocationError(alertMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch employees and departments on component mount
  useEffect(() => {
    if (checkAuthStatus()) {
      fetchEmployees();
      fetchDepartments(); // Fetch departments here
    }
  }, [apiBaseUrl, checkAuthStatus]); // Added getDepartmentEndpoint to dependencies

  // Effect to filter employees based on search query and selected department
  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    let filtered = employees;

    // Filter by department first if a department is selected
    if (selectedDepartmentForReport) {
      filtered = filtered.filter(emp =>
        (emp.department && emp.department._id === selectedDepartmentForReport) || // If department is an object
        (typeof emp.department === 'string' && emp.department === selectedDepartmentForReport) // If department is just an ID
      );
    }

    // Then filter by search query
    filtered = filtered.filter(emp =>
      (emp.name && emp.name.toLowerCase().includes(lowerCaseQuery)) ||
      (emp.username && emp.username.toLowerCase().includes(lowerCaseQuery)) ||
      (emp.email && emp.email.toLowerCase().includes(lowerCaseQuery))
    );
    setFilteredEmployees(filtered);
  }, [searchQuery, employees, selectedDepartmentForReport]);


  // Fetch attendance records when an employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeAttendance(selectedEmployee._id);
    }
  }, [selectedEmployee]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all employees
  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      let response;
      const baseUrl = getApiBaseUrl();
      try {
        response = await axios.get(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
      } catch (firstError) {
        try {
          response = await axios.get(`${baseUrl}/auth/users`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
        } catch (secondError) {
          response = await axios.get(`${baseUrl}/employees`, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
        }
      }

      const allUsers = response.data.data || response.data; // Adjust for common response structures
      const employeeUsers = allUsers.filter(user =>
        user.role === 'Employee' ||
        user.role === 'employee' ||
        !user.role // Assuming users without a specific role are employees
      );

      setEmployees(employeeUsers);
      setFilteredEmployees(employeeUsers);
      setError("");
    } catch (err) {
      console.error("Error fetching employees:", err);
      if (err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          setError("Authentication failed. Please log in again.");
          handleLogout(new Event('click'));
        } else {
          setError(`Server error: ${err.response.data.message || err.message}`);
        }
      } else if (err.request) {
        setError("No response from server. Please check if the server is running.");
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // New function to fetch departments
  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const departmentEndpoints = [
        `${getApiBaseUrl()}/departments`,
        `${getApiBaseUrl()}/department`,
        `${getApiBaseUrl()}/api/departments`,
        `${getApiBaseUrl()}/api/department`
      ];

      let departmentsData = null;
      let workingEndpoint = null;

      for (const endpoint of departmentEndpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
          });

          if (response.status >= 200 && response.status < 300) {
            // Check for common data structures
            if (response.data.data && Array.isArray(response.data.data)) {
              departmentsData = response.data.data;
            } else if (response.data.departments && Array.isArray(response.data.departments)) {
              departmentsData = response.data.departments;
            } else if (Array.isArray(response.data)) {
              departmentsData = response.data;
            }

            if (departmentsData && departmentsData.length > 0) {
              workingEndpoint = endpoint;
              break; // Found a working endpoint with data
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch departments from ${endpoint}:`, err.message);
        }
      }

      if (departmentsData && workingEndpoint) {
        setDepartments(departmentsData);
        localStorage.setItem('departmentEndpoint', workingEndpoint); // Store the working endpoint
        console.log('Departments updated:', departmentsData);
      } else {
        console.warn("No departments found from any known endpoint or data format was unexpected.");
        setDepartments([]); // Clear departments if none found or error
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  // Fetch attendance records for a specific employee
  const fetchEmployeeAttendance = async (employeeId) => {
    if (!checkAuthStatus()) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const baseUrl = getApiBaseUrl();
      const possibleEndpoints = [
        `${baseUrl}/attendance/employee/${employeeId}`,
        `${baseUrl}/attendance/user/${employeeId}`,
        `${baseUrl}/attendance/history/${employeeId}`,
        `${baseUrl}/attendance/${employeeId}`,
        `${baseUrl}/auth/attendance/employee/${employeeId}`,
        `${baseUrl}/auth/attendance/user/${employeeId}`,
        `${baseUrl}/auth/attendance/${employeeId}`,
        `${baseUrl}/employee/${employeeId}/attendance`,
        `${baseUrl}/employees/${employeeId}/attendance`,
        `${baseUrl}/user/${employeeId}/attendance`,
        `${baseUrl}/users/${employeeId}/attendance`,
        `${baseUrl}/attendance?employeeId=${employeeId}`,
        `${baseUrl}/attendance?userId=${employeeId}`,
        `${baseUrl}/auth/attendance?employeeId=${employeeId}`,
      ];

      let success = false;
      let fetchedAttendanceData = [];
      let lastError = null;

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });

          if (response.status >= 200 && response.status < 300 && response.data) {
            let data = [];
            if (response.data.success && Array.isArray(response.data.data)) {
              data = response.data.data;
            } else if (response.data.success && Array.isArray(response.data.attendance)) {
              data = response.data.attendance;
            } else if (Array.isArray(response.data)) {
              data = response.data;
            } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
              data = response.data.attendance;
            } else if (response.data.records && Array.isArray(response.data.records)) {
              data = response.data.records;
            } else if (response.data.history && Array.isArray(response.data.history)) {
              data = response.data.history;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              data = response.data.data;
            } else {
              const possibleArrays = Object.values(response.data).filter(Array.isArray);
              if (possibleArrays.length > 0) {
                data = possibleArrays[0];
              } else if (typeof response.data === 'object' && response.data !== null) {
                data = [response.data];
              }
            }
            fetchedAttendanceData = data;
            success = true;
            break;
          }
        } catch (error) {
          lastError = error;
          continue;
        }
      }

      if (success) {
        const formattedAttendance = fetchedAttendanceData.map(record => {
          let recordDate;
          if (record.date) {
            recordDate = new Date(record.date);
          } else if (record.timestamp) {
            recordDate = new Date(record.timestamp);
          } else if (record.createdAt) {
            recordDate = new Date(record.createdAt);
          } else {
            recordDate = new Date();
          }

          return {
            date: formatDate(recordDate),
            rawDate: recordDate,
            timeIn: formatTime(record.timeIn || record.clockIn || record.checkIn || record.startTime),
            timeOut: formatTime(record.timeOut || record.clockOut || record.checkOut || record.endTime),
            status: record.status || record.attendanceStatus || 'Present',
            originalData: record // Keep original data for accurate calculations
          };
        });

        formattedAttendance.sort((a, b) => b.rawDate - a.rawDate);

        setAttendanceRecords(formattedAttendance);
        setError("");

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const latestClockedInRecordForToday = formattedAttendance.find(record => {
          const recordDate = new Date(record.rawDate);
          return recordDate.toDateString() === new Date().toDateString() &&
                 record.timeIn !== 'N/A' &&
                 record.timeOut === 'N/A';
        });

        if (latestClockedInRecordForToday) {
          setIsClockedIn(true);
          setCurrentAttendanceRecordId(latestClockedInRecordForToday.originalData._id || latestClockedInRecordForToday.originalData.id);
        } else {
          setIsClockedIn(false);
          setCurrentAttendanceRecordId(null);
        }

      } else {
        let errorMessage = "Failed to fetch attendance records. ";
        if (lastError?.response) {
          const status = lastError.response.status;
          const responseData = lastError.response.data;
          if (status === 401 || status === 403) {
            errorMessage += "Authentication failed. Please log in again.";
            handleLogout(new Event('click'));
          } else {
            errorMessage += `HTTP ${status}: ${responseData?.message || lastError.message}`;
          }
        } else if (lastError?.request) {
          errorMessage += "No response from server. Please check if the server is running and accessible.";
        } else {
          errorMessage += `Network error: ${lastError?.message || 'Unknown error'}`;
        }
        setError(errorMessage);
        setAttendanceRecords([]);
      }

    } catch (err) {
      console.error("Unexpected error in fetchEmployeeAttendance:", err);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  // Calculate duration between time in and time out in hours
  const calculateDurationInHours = (rawTimeIn, rawTimeOut) => {
      if (!rawTimeIn || !rawTimeOut || rawTimeOut === '-') {
          return 0; // If clocked in but not out, or missing data, duration is 0 for payroll calculation
      }
      try {
          const inTime = new Date(rawTimeIn);
          const outTime = new Date(rawTimeOut);

          if (isNaN(inTime.getTime()) || isNaN(outTime.getTime())) {
              console.warn("Invalid date/time string passed to calculateDurationInHours:", rawTimeIn, rawTimeOut);
              return 0;
          }

          // Calculate difference in milliseconds
          let diffMs = outTime - inTime;

          // Handle overnight shifts: if outTime is earlier than inTime, assume it's next day
          if (diffMs < 0) {
              outTime.setDate(outTime.getDate() + 1);
              diffMs = outTime - inTime;
          }

          const hours = diffMs / (1000 * 60 * 60);
          return Math.max(0, hours); // Ensure non-negative hours
      } catch (err) {
          console.error("Error calculating duration in hours:", err);
          return 0;
      }
  };

  // Calculate duration string for display (now using calculateDurationInHours for consistency)
  const formatDurationForDisplay = (rawTimeIn, rawTimeOut) => {
    const totalHours = calculateDurationInHours(rawTimeIn, rawTimeOut);
    if (totalHours === 0 && (!rawTimeIn || !rawTimeOut || rawTimeOut === '-')) {
      return '-';
    }

    const wholeHours = Math.floor(totalHours);
    const fractionalMinutes = (totalHours - wholeHours) * 60;
    const roundedMinutes = Math.round(fractionalMinutes);

    // Handle cases where rounding minutes up makes them 60
    if (roundedMinutes === 60) {
        return `${wholeHours + 1}h 0m`;
    }

    return `${wholeHours}h ${roundedMinutes}m`;
};


  // Handle employee selection
  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setManualAttendance({
      ...manualAttendance,
      employeeId: employee._id
    });
    setIsClockedIn(false);
    setCurrentAttendanceRecordId(null);
    setSearchQuery(employee.name || employee.username); // Update search query to display selected employee's name
    setIsDropdownOpen(false); // Close dropdown on selection
  };

  // Handle search input change
  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Filter employees as the user types
    const lowerCaseQuery = query.toLowerCase();
    const filtered = employees.filter(emp =>
      (emp.name && emp.name.toLowerCase().includes(lowerCaseQuery)) ||
      (emp.username && emp.username.toLowerCase().includes(lowerCaseQuery)) ||
      (emp.email && emp.email.toLowerCase().includes(lowerCaseQuery))
    );
    setFilteredEmployees(filtered);
    // Open dropdown if there's a query and matching results
    setIsDropdownOpen(query.length > 0 && filtered.length > 0);
    // If the search query clears, also clear selected employee
    if (query === "") {
        setSelectedEmployee(null);
    }
  };


  // Handle input change for manual attendance form
  const handleAttendanceChange = (e) => {
    setManualAttendance({
      ...manualAttendance,
      [e.target.name]: e.target.value
    });
  };

  // Handle date range change
  const handleDateRangeChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  // Handle payroll settings change
  const handlePayrollSettingsChange = (e) => {
    setPayrollSettings({
      ...payrollSettings,
      [e.target.name]: parseFloat(e.target.value) || 0
    });
  };

  // Open manual attendance modal
  const handleManualAttendance = () => {
    if (!selectedEmployee) {
      setError("Please select an employee first");
      return;
    }
    setIsAttendanceModalOpen(true);
  };

  // Submit manual attendance record
  const submitManualAttendance = async () => {
    try {
      setIsLoading(true);

      if (!manualAttendance.date || !manualAttendance.timeIn || !manualAttendance.status || !manualAttendance.employeeId) {
        setError("Please fill out all required fields (Employee, Date, Time In, Status)!");
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      const baseUrl = getApiBaseUrl();
      const manualEndpoint = `${baseUrl}/attendance/manual`;

      const attendancePayload = {
        employeeId: manualAttendance.employeeId,
        date: manualAttendance.date,
        timeIn: manualAttendance.timeIn,
        timeOut: manualAttendance.timeOut || "",
        status: manualAttendance.status
      };

      const response = await axios.post(
        manualEndpoint,
        attendancePayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const isSuccess = response.data.success !== false && (response.status === 200 || response.status === 201);
      if (isSuccess) {
        if (selectedEmployee?._id) {
          await fetchEmployeeAttendance(selectedEmployee._id);
        }
        setManualAttendance({
          employeeId: selectedEmployee?._id || "",
          date: new Date().toISOString().split('T')[0],
          timeIn: "",
          timeOut: "",
          status: "Present"
        });
        setIsAttendanceModalOpen(false);
        setError("");
        const successMessage = response.data.message || "Manual attendance record added successfully";
        setError(`Success: ${successMessage}`);
      } else {
        setError(response.data.message || "Failed to record attendance");
      }
    } catch (error) {
      console.error("Error submitting manual attendance:", error);
      if (error.response) {
        const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        setError(`Failed to submit attendance: ${errorMessage}`);
      } else if (error.request) {
        setError("Network error: Unable to connect to server. Check your internet connection.");
      } else {
        setError(`Request failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };


  // Helper function to get week number (copied from calculatePayroll for reusability)
  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${weekNo}`;
  };

  // Calculate payroll
  const calculatePayroll = (shouldOpenModal = true) => { // Added parameter
    if (!selectedEmployee || attendanceRecords.length === 0) {
      setError("Please select an employee and ensure they have attendance records.");
      setPayrollData({ // Reset payroll data to avoid showing old NaN values
        totalHours: 0, totalPay: 0, overtimeHours: 0, regularHours: 0, overtimePay: 0, regularPay: 0
      });
      return;
    }

    let totalRegularHoursAccrued = 0;
    let totalDailyOvertimeMinutes = 0;
    let totalWeeklyOvertimeHours = 0;

    const filteredRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.rawDate);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      recordDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      return recordDate >= startDate && recordDate <= endDate;
    });

    const weeklyRegularHoursAccumulator = {};

    filteredRecords.forEach(record => {
      // Pass raw time strings to duration calculations
      const dailyTotalHours = calculateDurationInHours(record.originalData.timeIn || record.originalData.clockIn, record.originalData.timeOut || record.originalData.clockOut);

      let dailyOvertime = 0;
      let dailyRegular = 0;

      if (dailyTotalHours > payrollSettings.dailyRegularHoursLimit) {
        dailyRegular = payrollSettings.dailyRegularHoursLimit;
        dailyOvertime = dailyTotalHours - payrollSettings.dailyRegularHoursLimit;
      } else {
        dailyRegular = dailyTotalHours;
        dailyOvertime = 0;
      }

      totalDailyOvertimeMinutes += dailyOvertime * 60; // Accumulate daily overtime in minutes

      const recordDate = new Date(record.rawDate);
      const weekKey = getWeekNumber(recordDate);
      weeklyRegularHoursAccumulator[weekKey] = (weeklyRegularHoursAccumulator[weekKey] || 0) + dailyRegular;
    });

    for (const weekKey in weeklyRegularHoursAccumulator) {
      let regularHoursInWeek = weeklyRegularHoursAccumulator[weekKey];

      if (regularHoursInWeek > payrollSettings.regularHoursLimit) {
        totalWeeklyOvertimeHours += (regularHoursInWeek - payrollSettings.regularHoursLimit);
        totalRegularHoursAccrued += payrollSettings.regularHoursLimit; // Cap regular hours at weekly limit
      } else {
        totalRegularHoursAccrued += regularHoursInWeek;
      }
    }

    const regularPay = totalRegularHoursAccrued * payrollSettings.regularRate;
    const dailyOvertimePay = totalDailyOvertimeMinutes * payrollSettings.dailyOvertimeRatePerMinute;
    const weeklyOvertimePay = totalWeeklyOvertimeHours * payrollSettings.overtimeRate;

    const totalOvertimeHoursDisplay = (totalDailyOvertimeMinutes / 60) + totalWeeklyOvertimeHours;
    const totalPay = regularPay + dailyOvertimePay + weeklyOvertimePay;
    const totalHoursWorkedDisplay = totalRegularHoursAccrued + totalOvertimeHoursDisplay;

    // Set payroll data, ensuring all values are properly formatted
    setPayrollData({
      totalHours: parseFloat(totalHoursWorkedDisplay.toFixed(2)),
      regularHours: parseFloat(totalRegularHoursAccrued.toFixed(2)),
      overtimeHours: parseFloat(totalOvertimeHoursDisplay.toFixed(2)),
      regularPay: parseFloat(regularPay.toFixed(2)),
      overtimePay: parseFloat((dailyOvertimePay + weeklyOvertimePay).toFixed(2)),
      totalPay: parseFloat(totalPay.toFixed(2))
    });

    if (shouldOpenModal) { // Only open modal if specifically requested
      setIsPayrollModalOpen(true);
    }
  };

  // Generate PDF report for a single employee
  const generatePayrollReport = async () => {
    if (!selectedEmployee || attendanceRecords.length === 0) {
      setError("No attendance data available to export");
      return;
    }

    setIsExporting(true);

    try {
      // Ensure payroll data is calculated before generating report
      await calculatePayroll(false); // Await for payrollData to be updated

      // Now payrollData should be updated
      console.log("After awaited calculatePayroll call:", payrollData);
      console.log("Total Hours:", payrollData.totalHours);
      console.log("Total Pay:", payrollData.totalPay);

      const doc = new jsPDF();

      let filteredRecords = [...attendanceRecords];

      if (dateRange.startDate && dateRange.endDate) {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);

        filteredRecords = filteredRecords.filter(record => {
          return record.rawDate >= startDate && record.rawDate <= endDate;
        });
      }

      if (filteredRecords.length === 0) {
        setError("No records found in the selected date range");
        setIsExporting(false);
        return;
      }

      doc.setFontSize(18);
      doc.text(`Attendance & Payroll Report`, 14, 20);

      doc.setFontSize(12);
      doc.text(`Employee: ${selectedEmployee.name}`, 14, 35);
      doc.text(`Employee ID: ${selectedEmployee._id}`, 14, 45);
      doc.text(`Period: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`, 14, 55);

      const tableData = filteredRecords.map(record => {
        const hoursWorked = calculateDurationInHours(record.originalData.timeIn || record.originalData.clockIn, record.originalData.timeOut || record.originalData.clockOut);
        
        // Calculate daily regular and daily overtime for this record
        const dailyRegularHours = Math.min(hoursWorked, payrollSettings.dailyRegularHoursLimit);
        const dailyOvertimeHours = Math.max(0, hoursWorked - payrollSettings.dailyRegularHoursLimit);
        
        const dailyRegularPay = (dailyRegularHours * payrollSettings.regularRate).toFixed(2);
        // Daily overtime pay is calculated based on minutes for dailyOvertimeRatePerMinute
        const dailyOvertimePayAmount = (dailyOvertimeHours * 60 * payrollSettings.dailyOvertimeRatePerMinute).toFixed(2);


        return [
          record.date,
          record.timeIn,
          record.timeOut,
          formatDurationForDisplay(record.originalData.timeIn || record.originalData.clockIn, record.originalData.timeOut || record.originalData.clockOut),
          record.status,
          hoursWorked.toFixed(2),
          `$${dailyRegularPay}`,
          `$${dailyOvertimePayAmount}`
        ];
      });

      autoTable(doc, {
        head: [['Date', 'Time In', 'Time Out', 'Duration', 'Status', 'Hours', 'Regular Pay', 'Overtime Pay']],
        body: tableData,
        startY: 65,
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34] },
        styles: { fontSize: 8 }
      });

      let finalY = (doc.autoTable && doc.autoTable.previous) ? doc.autoTable.previous.finalY : 65 + (tableData.length * 10);

      doc.setFontSize(12);
      // Display overall payroll summary at the end of the report using payrollData state
      doc.text(`Total Hours: ${payrollData.totalHours}`, 14, finalY + 10);
      doc.text(`Total Regular Pay: $${payrollData.regularPay}`, 14, finalY + 15);
      doc.text(`Total Overtime Pay: $${payrollData.overtimePay}`, 14, finalY + 20);
      doc.text(`Grand Total Pay: $${payrollData.totalPay}`, 14, finalY + 25);

      const startDateFormatted = new Date(dateRange.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const endDateFormatted = new Date(dateRange.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const fileName = `${selectedEmployee.name.replace(/\s+/g, '_')}_Attendance_Payroll_${startDateFormatted}_to_${endDateFormatted}.pdf`;

      doc.save(fileName);
      setError("");
    } catch (err) {
      console.error("Error exporting attendance data:", err);
      setError(`Failed to export data: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Export attendance for all employees or by department
  const exportAllAttendanceToPDF = async () => {
    if (!employees.length) {
      setError("No employees available to export data.");
      return;
    }
    
    setIsExporting(true);

    try {
      if (!dateRange.startDate || !dateRange.endDate) {
        setError("Please select a date range for the export");
        setIsExporting(false);
        return;
      }
      
      const allData = [];
      const employeePayrollSummaries = {}; // New object to store payroll summaries for all employees
      let errorOccurred = false;
      
      // Determine which employees to include based on selectedDepartmentForReport
      let employeesToExport = employees;
      let reportTitle = 'All Employees Attendance & Payroll Report';
      let fileNameDepartmentPart = 'All_Departments';

      if (selectedDepartmentForReport) {
        const departmentName = departments.find(d => d._id === selectedDepartmentForReport || d.id === selectedDepartmentForReport)?.name || 'Unknown Department';
        employeesToExport = employees.filter(emp =>
          (emp.department && emp.department._id === selectedDepartmentForReport) ||
          (typeof emp.department === 'string' && emp.department === selectedDepartmentForReport)
        );
        reportTitle = `Attendance & Payroll Report for ${departmentName} Department`;
        fileNameDepartmentPart = departmentName.replace(/\s+/g, '_');
      }

      console.log("Employees to export:", employeesToExport.map(e => e.name)); // DEBUG LOG
      console.log("Number of employees to export:", employeesToExport.length); // DEBUG LOG

      if (employeesToExport.length === 0) {
        setError(selectedDepartmentForReport ? `No employees found in the selected department for the report.` : "No employees available to export data.");
        setIsExporting(false);
        return;
      }

      for (const employee of employeesToExport) {
        console.log(`Fetching attendance for: ${employee.name} (ID: ${employee._id})`); // DEBUG LOG
        try {
          const baseUrl = getApiBaseUrl();
          const response = await axios.get(`${baseUrl}/attendance/employee/${employee._id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          });
          
          if (response.data.success && Array.isArray(response.data.data)) {
            const startDate = new Date(dateRange.startDate);
            const endDate = new Date(dateRange.endDate);
            endDate.setHours(23, 59, 59, 999);
            
            const filteredDataForEmployee = response.data.data // Renamed for clarity
              .filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= startDate && recordDate <= endDate;
              });
              
            // --- START: Payroll Calculation for current employee ---
            let employeeTotalRegularHoursAccrued = 0;
            let employeeTotalDailyOvertimeMinutes = 0;
            let employeeTotalWeeklyOvertimeHours = 0;
            const employeeWeeklyRegularHoursAccumulator = {};

            filteredDataForEmployee.forEach(record => {
              const dailyTotalHours = calculateDurationInHours(record.timeIn || record.clockIn, record.timeOut || record.clockOut);

              let dailyOvertime = 0;
              let dailyRegular = 0;

              if (dailyTotalHours > payrollSettings.dailyRegularHoursLimit) {
                dailyRegular = payrollSettings.dailyRegularHoursLimit;
                dailyOvertime = dailyTotalHours - payrollSettings.dailyRegularHoursLimit;
              } else {
                dailyRegular = dailyTotalHours;
                dailyOvertime = 0;
              }

              employeeTotalDailyOvertimeMinutes += dailyOvertime * 60;

              const recordDate = new Date(record.date); // Use record.date as it's the raw date from API
              const weekKey = getWeekNumber(recordDate);
              employeeWeeklyRegularHoursAccumulator[weekKey] = (employeeWeeklyRegularHoursAccumulator[weekKey] || 0) + dailyRegular;
            });

            for (const weekKey in employeeWeeklyRegularHoursAccumulator) {
              let regularHoursInWeek = employeeWeeklyRegularHoursAccumulator[weekKey];
              if (regularHoursInWeek > payrollSettings.regularHoursLimit) {
                employeeTotalWeeklyOvertimeHours += (regularHoursInWeek - payrollSettings.regularHoursLimit);
                employeeTotalRegularHoursAccrued += payrollSettings.regularHoursLimit;
              } else {
                employeeTotalRegularHoursAccrued += regularHoursInWeek;
              }
            }

            const employeeRegularPay = employeeTotalRegularHoursAccrued * payrollSettings.regularRate;
            const employeeDailyOvertimePay = employeeTotalDailyOvertimeMinutes * payrollSettings.dailyOvertimeRatePerMinute;
            const employeeWeeklyOvertimePay = employeeTotalWeeklyOvertimeHours * payrollSettings.overtimeRate;

            const employeeTotalOvertimeHours = (employeeTotalDailyOvertimeMinutes / 60) + employeeTotalWeeklyOvertimeHours;
            const employeeTotalPay = employeeRegularPay + employeeDailyOvertimePay + employeeWeeklyOvertimePay;
            const employeeTotalHoursWorked = employeeTotalRegularHoursAccrued + employeeTotalOvertimeHours;

            employeePayrollSummaries[employee._id] = {
              name: employee.name,
              totalHours: parseFloat(employeeTotalHoursWorked.toFixed(2)),
              regularHours: parseFloat(employeeTotalRegularHoursAccrued.toFixed(2)),
              overtimeHours: parseFloat(employeeTotalOvertimeHours.toFixed(2)),
              regularPay: parseFloat(employeeRegularPay.toFixed(2)),
              overtimePay: parseFloat((employeeDailyOvertimePay + employeeWeeklyOvertimePay).toFixed(2)),
              totalPay: parseFloat(employeeTotalPay.toFixed(2))
            };
            // --- END: Payroll Calculation for current employee ---

            const formattedRecords = filteredDataForEmployee.map(record => {
                const hoursWorked = calculateDurationInHours(record.timeIn || record.clockIn, record.timeOut || record.clockOut);
                
                const dailyRegularHours = Math.min(hoursWorked, payrollSettings.dailyRegularHoursLimit);
                const dailyOvertimeHours = Math.max(0, hoursWorked - payrollSettings.dailyRegularHoursLimit);
                
                const dailyRegularPay = (dailyRegularHours * payrollSettings.regularRate).toFixed(2);
                const dailyOvertimePayAmount = (dailyOvertimeHours * 60 * payrollSettings.dailyOvertimeRatePerMinute).toFixed(2);

                return [
                  new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  employee.name, // Include employee name in each row for clarity in multi-employee report
                  formatTime(record.timeIn || record.clockIn),
                  formatTime(record.timeOut || record.timeOut),
                  formatDurationForDisplay(record.timeIn || record.clockIn, record.timeOut || record.clockOut),
                  record.status,
                  hoursWorked.toFixed(2),
                  `$${dailyRegularPay}`,
                  `$${dailyOvertimePayAmount}`
                ];
              });
              
            allData.push(...formattedRecords);
            console.log(`Added ${filteredDataForEmployee.length} records for ${employee.name}. Total records in allData: ${allData.length}`); // DEBUG LOG
          } else {
            console.warn(`No attendance data found for ${employee.name} or unexpected response structure.`); // DEBUG LOG
          }
        } catch (err) {
          console.error(`Error fetching attendance for employee ${employee.name}:`, err);
          errorOccurred = true;
        }
      }
      
      console.log("Final allData before PDF generation:", allData); // DEBUG LOG

      if (allData.length === 0) {
        setError("No attendance records found for the selected date range across the chosen employees/department.");
        setIsExporting(false);
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(reportTitle, 14, 20);
      
      doc.setFontSize(12);
      const startDateFormatted = new Date(dateRange.startDate).toLocaleDateString();
      const endDateFormatted = new Date(dateRange.endDate).toLocaleDateString();
      doc.text(`Period: ${startDateFormatted} - ${endDateFormatted}`, 14, 35);

      autoTable(doc, {
        head: [['Date', 'Employee', 'Time In', 'Time Out', 'Duration', 'Status', 'Hours', 'Regular Pay', 'Overtime Pay']],
        body: allData,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34] },
        styles: { fontSize: 7 }
      });

      // --- START: Add Employee Payroll Summary Table to PDF ---
      let finalY = (doc.autoTable && doc.autoTable.previous) ? doc.autoTable.previous.finalY : 45 + (allData.length * 10);
      doc.addPage(); // Add a new page for the summary
      doc.setFontSize(18);
      doc.text(`Payroll Summary - ${reportTitle}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Period: ${startDateFormatted} - ${endDateFormatted}`, 14, 35);


      const summaryTableData = Object.values(employeePayrollSummaries).map(summary => [
        summary.name,
        summary.totalHours.toFixed(2),
        summary.regularHours.toFixed(2),
        summary.overtimeHours.toFixed(2),
        `$${summary.regularPay.toFixed(2)}`,
        `$${summary.overtimePay.toFixed(2)}`,
        `$${summary.totalPay.toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [['Employee', 'Total Hours', 'Regular Hours', 'Overtime Hours', 'Regular Pay', 'Overtime Pay', 'Total Pay']],
        body: summaryTableData,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34] },
        styles: { fontSize: 8 }
      });
      // --- END: Add Employee Payroll Summary Table to PDF ---

      const fileName = `${fileNameDepartmentPart}_Attendance_Payroll_${new Date(dateRange.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-')}_to_${new Date(dateRange.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-')}.pdf`;
      
      doc.save(fileName);
      
      if (errorOccurred) {
        setError("Some employee data could not be fetched. The export may be incomplete.");
      } else {
        setError("");
      }
    } catch (err) {
      console.error("Error exporting all attendance data:", err);
      setError(`Failed to export data: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Determine the text for the "Export All" button based on selectedDepartmentForReport
  const getExportAllButtonText = () => {
    if (isExporting) {
      return 'Exporting...';
    }
    const selectedDept = departments.find(d => d._id === selectedDepartmentForReport || d.id === selectedDepartmentForReport);
    return selectedDept ? `Export ${selectedDept.name} Report` : 'Export All Employees Report';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <Calculator className="mr-3 text-green-600" size={32} /> Attendance & Payroll Tracking
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Combined Employee Search and Selection */}
          <div className="md:col-span-1">
            <label htmlFor="employee-search-select" className="block text-sm font-medium text-gray-700 mb-2">
              Search & Select Employee:
            </label>
            <div className="relative">
              <input
                type="text"
                id="employee-search-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
                placeholder="Search by name or email"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => setIsDropdownOpen(true)} // Open dropdown on focus
                // Close dropdown on blur with a slight delay to allow click events on list items to register
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 100)} 
                disabled={isLoading}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              {isDropdownOpen && filteredEmployees.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                  {filteredEmployees.map(employee => (
                    <li
                      key={employee._id}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleEmployeeSelect(employee)}
                    >
                      {employee.name || employee.username} ({employee.email})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Department Filter for Reports */}
          <div className="md:col-span-1">
            <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Department (for Reports):
            </label>
            <select
              id="department-filter"
              name="selectedDepartmentForReport"
              value={selectedDepartmentForReport}
              onChange={(e) => setSelectedDepartmentForReport(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id || dept.id} value={dept._id || dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selection */}
          <div className="md:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date:
              </label>
              <input
                type="date"
                id="start-date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateRangeChange}
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date:
              </label>
              <input
                type="date"
                id="end-date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateRangeChange}
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
              />
            </div>
          </div>
        </div>

        {selectedEmployee && (
          <div className="mb-6 bg-green-50 p-4 rounded-md border border-green-200">
            <h2 className="text-xl font-semibold text-green-800 mb-2">
              Attendance Actions for {selectedEmployee.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${isClockedIn ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                Status: {isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </span>
              <button
                onClick={handleClockIn}
                disabled={isLoading || isClockedIn}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn size={18} className="mr-2" />
                {isLoading && !isClockedIn ? 'Clocking In...' : 'Clock In'}
              </button>
              <button
                onClick={handleClockOut}
                disabled={isLoading || !isClockedIn}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={18} className="mr-2" />
                {isLoading && isClockedIn ? 'Clocking Out...' : 'Clock Out'}
              </button>
              <button
                onClick={handleManualAttendance}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50"
              >
                <MousePointerClick size={18} className="mr-2" />
                Add Manual Entry
              </button>
              {locationError && (
                <p className="text-red-500 text-sm mt-1">{locationError}</p>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto mb-6 border rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time In
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Out
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    Loading attendance records...
                  </td>
                </tr>
              ) : attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No attendance records found for the selected employee in this date range.
                  </td>
                </tr>
              ) : (
                attendanceRecords.filter(record => {
                  const recordDate = new Date(record.rawDate).toISOString().split('T')[0];
                  return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate;
                }).map((record, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.timeIn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.timeOut}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* Using the new formatDurationForDisplay function for consistency */}
                      {formatDurationForDisplay(record.originalData.timeIn || record.originalData.clockIn, record.originalData.timeOut || record.originalData.clockOut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'Present' ? 'bg-green-100 text-green-800' : record.status === 'Absent' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.originalData.isLate && <span className="text-red-500 text-xs mr-2">Late</span>}
                      {record.originalData.isOvertime && <span className="text-green-500 text-xs">Overtime</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payroll Settings and Actions */}
        <div className="mb-6 p-6 bg-green-50 rounded-lg border border-green-200">
          <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
            <DollarSign className="mr-2" /> Payroll Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="regular-rate" className="block text-sm font-medium text-gray-700 mb-1">
                Regular Rate ($/hour):
              </label>
              <input
                type="number"
                id="regular-rate"
                name="regularRate"
                value={payrollSettings.regularRate}
                onChange={handlePayrollSettingsChange}
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="overtime-rate" className="block text-sm font-medium text-gray-700 mb-1">
                Weekly Overtime Rate ($/hour):
              </label>
              <input
                type="number"
                id="overtime-rate"
                name="overtimeRate"
                value={payrollSettings.overtimeRate}
                onChange={handlePayrollSettingsChange}
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="regular-hours-limit" className="block text-sm font-medium text-gray-700 mb-1">
                Weekly Regular Hours Limit:
              </label>
              <input
                type="number"
                id="regular-hours-limit"
                name="regularHoursLimit"
                value={payrollSettings.regularHoursLimit}
                onChange={handlePayrollSettingsChange}
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="daily-regular-hours-limit" className="block text-sm font-medium text-gray-700 mb-1">
                Daily Regular Hours Limit:
              </label>
              <input
                type="number"
                id="daily-regular-hours-limit"
                name="dailyRegularHoursLimit"
                value={payrollSettings.dailyRegularHoursLimit}
                onChange={handlePayrollSettingsChange}
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="daily-overtime-rate-per-minute" className="block text-sm font-medium text-gray-700 mb-1">
                Daily Overtime Rate ($/minute):
              </label>
              <input
                type="number"
                id="daily-overtime-rate-per-minute"
                name="dailyOvertimeRatePerMinute"
                step="0.01"
                value={payrollSettings.dailyOvertimeRatePerMinute}
                onChange={handlePayrollSettingsChange}
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md shadow-sm"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={calculatePayroll}
              disabled={isLoading || !selectedEmployee || attendanceRecords.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Calculator size={18} className="mr-2" /> Calculate Payroll
            </button>
            <button
              onClick={generatePayrollReport}
              disabled={isExporting || !selectedEmployee || attendanceRecords.length === 0}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Download size={18} className="mr-2" /> {isExporting ? 'Generating...' : 'Download Report (Selected Employee)'}
            </button>
            <button
              onClick={exportAllAttendanceToPDF}
              disabled={isExporting || employees.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Download size={18} className="mr-2" /> {getExportAllButtonText()}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Attendance Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Add Manual Attendance Record for {selectedEmployee?.name}</h2>
            <form onSubmit={(e) => { e.preventDefault(); submitManualAttendance(); }}>
              <div className="mb-4">
                <label htmlFor="manual-date" className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  id="manual-date"
                  name="date"
                  value={manualAttendance.date}
                  onChange={handleAttendanceChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="manual-timeIn" className="block text-sm font-medium text-gray-700">Time In</label>
                <input
                  type="time"
                  id="manual-timeIn"
                  name="timeIn"
                  value={manualAttendance.timeIn}
                  onChange={handleAttendanceChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="manual-timeOut" className="block text-sm font-medium text-gray-700">Time Out (Optional)</label>
                <input
                  type="time"
                  id="manual-timeOut"
                  name="timeOut"
                  value={manualAttendance.timeOut}
                  onChange={handleAttendanceChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="manual-status" className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  id="manual-status"
                  name="status"
                  value={manualAttendance.status}
                  onChange={handleAttendanceChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Submitting...' : 'Submit Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payroll Summary Modal */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
              <DollarSign className="mr-2" /> Payroll Summary for {selectedEmployee?.name}
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium">Total Hours:</span>
                <span className="text-sm font-bold">{payrollData.totalHours}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium">Regular Hours:</span>
                <span className="text-sm">{payrollData.regularHours}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b pb-2">
                <span className="text-sm font-medium">Overtime Hours:</span>
                <span className="text-sm">{payrollData.overtimeHours}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium">Regular Pay:</span>
                <span className="text-sm">${payrollData.regularPay}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b pb-2">
                <span className="text-sm font-medium">Overtime Pay:</span>
                <span className="text-sm">${payrollData.overtimePay}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t pt-2">
                <span className="text-lg font-bold">Total Pay:</span>
                <span className="text-lg font-bold text-green-600">${payrollData.totalPay}</span>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsPayrollModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
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

export default AdminAttendanceTracking;
