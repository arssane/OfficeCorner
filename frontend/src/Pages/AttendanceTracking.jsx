import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MousePointerClick, Download, DollarSign, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminAttendanceTracking = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [allAttendanceData, setAllAttendanceData] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:5000/api");
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [payrollData, setPayrollData] = useState({
    totalHours: 0,
    totalPay: 0,
    overtimeHours: 0,
    overtimePay: 0,
    regularPay: 0
  });
  const [payrollSettings, setPayrollSettings] = useState({
    regularRate: 45, // Default $45/hour
    overtimeRate: 67.5, // 1.5x regular rate
    regularHoursLimit: 40 // 40 hours per week before overtime
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

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, [apiBaseUrl]);

  // Fetch attendance records when an employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeAttendance(selectedEmployee._id);
    }
  }, [selectedEmployee]);

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
      
      // FIXED: Use the same endpoint pattern as EmployeeManagement
      let response;
      try {
        // First try: /api/users (common endpoint for user management)
        response = await axios.get(`${apiBaseUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });
      } catch (firstError) {
        try {
          // Second try: /api/auth/users (if auth router handles user listing)
          response = await axios.get(`${apiBaseUrl}/auth/users`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
        } catch (secondError) {
          // Third try: /api/employees (specific employee endpoint)
          response = await axios.get(`${apiBaseUrl}/employees`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
        }
      }
      
      // Filter to show only employees or all users based on your needs
      const allUsers = response.data;
      const employeeUsers = allUsers.filter(user => 
        user.role === 'Employee' || 
        user.role === 'employee' || 
        !user.role // Include users without role as potential employees
      );
      
      setEmployees(employeeUsers);
      setError("");
    } catch (err) {
      console.error("Error fetching employees:", err);
      
      if (err.response) {
        if (err.response.status === 404) {
          setError(`API endpoint not found. Please check your backend routes. Tried: /users, /auth/users, /employees`);
        } else if (err.response.status === 401 || err.response.status === 403) {
          setError("Authentication failed. Please log in again.");
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

  // Fetch attendance records for a specific employee - FIXED VERSION
const fetchEmployeeAttendance = async (employeeId) => {
  try {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    
    if (!token) {
      setError("Authentication token not found. Please log in again.");
      setIsLoading(false);
      return;
    }
    
    // Check if we have a stored working endpoint from previous successful calls
    const storedEndpointPattern = localStorage.getItem("attendanceHistoryEndpoint");
    
    // Define all possible attendance endpoints to try
    const possibleEndpoints = [
      // If we have a stored pattern, try it first
      ...(storedEndpointPattern ? [storedEndpointPattern.replace('{employeeId}', employeeId)] : []),
      
      // Standard REST patterns
      `${apiBaseUrl}/attendance/employee/${employeeId}`,
      `${apiBaseUrl}/attendance/user/${employeeId}`,
      `${apiBaseUrl}/attendance/history/${employeeId}`,
      `${apiBaseUrl}/attendance/${employeeId}`,
      
      // Auth-protected patterns
      `${apiBaseUrl}/auth/attendance/employee/${employeeId}`,
      `${apiBaseUrl}/auth/attendance/user/${employeeId}`,
      `${apiBaseUrl}/auth/attendance/${employeeId}`,
      
      // Employee/User resource patterns
      `${apiBaseUrl}/employee/${employeeId}/attendance`,
      `${apiBaseUrl}/employees/${employeeId}/attendance`,
      `${apiBaseUrl}/user/${employeeId}/attendance`,
      `${apiBaseUrl}/users/${employeeId}/attendance`,
      
      // Query parameter patterns
      `${apiBaseUrl}/attendance?employeeId=${employeeId}`,
      `${apiBaseUrl}/attendance?userId=${employeeId}`,
      `${apiBaseUrl}/auth/attendance?employeeId=${employeeId}`,
    ];
    
    let success = false;
    let lastError = null;
    
    // Try each endpoint until one works
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying attendance endpoint: ${endpoint}`);
        
        const response = await axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 15000 // Increased timeout
        });
        
        if (response.status >= 200 && response.status < 300 && response.data) {
          console.log(`Success with attendance endpoint: ${endpoint}`, response.data);
          
          // Store the working endpoint pattern for future use
          const basePattern = endpoint.replace(employeeId, '{employeeId}');
          localStorage.setItem("attendanceHistoryEndpoint", basePattern);
          
          // Handle different response formats from various backend implementations
          let attendanceData = [];
          
          // Check for different possible response structures
          if (response.data.success && Array.isArray(response.data.data)) {
            // Format: { success: true, data: [...] }
            attendanceData = response.data.data;
          } else if (response.data.success && Array.isArray(response.data.attendance)) {
            // Format: { success: true, attendance: [...] }
            attendanceData = response.data.attendance;
          } else if (Array.isArray(response.data)) {
            // Format: [...]
            attendanceData = response.data;
          } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
            // Format: { attendance: [...] }
            attendanceData = response.data.attendance;
          } else if (response.data.records && Array.isArray(response.data.records)) {
            // Format: { records: [...] }
            attendanceData = response.data.records;
          } else if (response.data.history && Array.isArray(response.data.history)) {
            // Format: { history: [...] }
            attendanceData = response.data.history;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            // Format: { data: [...] }
            attendanceData = response.data.data;
          } else {
            console.warn("Unexpected response format:", response.data);
            // Try to extract any array from the response
            const possibleArrays = Object.values(response.data).filter(Array.isArray);
            if (possibleArrays.length > 0) {
              attendanceData = possibleArrays[0];
            } else {
              // If response contains a single object, wrap it in an array
              if (typeof response.data === 'object' && response.data !== null) {
                attendanceData = [response.data];
              }
            }
          }
          
          console.log("Extracted attendance data:", attendanceData);
          
          // Format the attendance data to match our expected structure
          const formattedAttendance = attendanceData.map(record => {
            // Handle different date formats
            let recordDate;
            if (record.date) {
              recordDate = new Date(record.date);
            } else if (record.timestamp) {
              recordDate = new Date(record.timestamp);
            } else if (record.createdAt) {
              recordDate = new Date(record.createdAt);
            } else {
              recordDate = new Date(); // Fallback to current date
            }
            
            // Handle different time formats
            const formatTime = (timeValue) => {
              if (!timeValue || timeValue === null || timeValue === '') return '-';
              
              // If it's already in HH:MM format, return as is
              if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}$/.test(timeValue)) {
                return timeValue;
              }
              
              // If it's a full datetime string, extract time
              if (typeof timeValue === 'string' && timeValue.includes('T')) {
                try {
                  return new Date(timeValue).toLocaleTimeString('en-US', { 
                    hour12: false,
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                } catch (e) {
                  return timeValue;
                }
              }
              
              return timeValue.toString();
            };
            
            return {
              date: recordDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              }),
              rawDate: recordDate,
              timeIn: formatTime(record.timeIn || record.clockIn || record.checkIn || record.startTime),
              timeOut: formatTime(record.timeOut || record.clockOut || record.checkOut || record.endTime),
              status: record.status || record.attendanceStatus || 'Present',
              // Store original record data for debugging and export
              originalData: record
            };
          });
          
          // Sort by date (newest first)
          formattedAttendance.sort((a, b) => b.rawDate - a.rawDate);
          
          console.log("Formatted attendance records:", formattedAttendance);
          
          setAttendanceRecords(formattedAttendance);
          setError("");
          success = true;
          break;
        }
      } catch (error) {
        console.log(`Failed with attendance endpoint ${endpoint}:`, error.message);
        lastError = error;
        continue;
      }
    }
    
    // If all endpoints failed, provide detailed error information
    if (!success) {
      console.error("All attendance endpoints failed. Last error:", lastError);
      
      let errorMessage = "Failed to fetch attendance records. ";
      
      if (lastError?.response) {
        const status = lastError.response.status;
        const responseData = lastError.response.data;
        
        if (status === 404) {
          errorMessage += `Attendance API endpoint not found. Please check your backend configuration. Tried endpoints: ${possibleEndpoints.slice(0, 5).join(', ')}...`;
        } else if (status === 401 || status === 403) {
          errorMessage += "Authentication failed. Please log in again.";
        } else if (status === 500) {
          errorMessage += `Server error: ${responseData?.message || 'Internal server error'}`;
        } else {
          errorMessage += `HTTP ${status}: ${responseData?.message || lastError.message}`;
        }
      } else if (lastError?.request) {
        errorMessage += "No response from server. Please check if the server is running and accessible.";
      } else {
        errorMessage += `Network error: ${lastError?.message || 'Unknown error'}`;
      }
      
      setError(errorMessage);
      
      // Don't clear existing records if we had some before
      if (attendanceRecords.length === 0) {
        setAttendanceRecords([]);
      }
    }
    
  } catch (err) {
    console.error("Unexpected error in fetchEmployeeAttendance:", err);
    setError(`Unexpected error: ${err.message}`);
  } finally {
    setIsLoading(false);
  }
};

  // Handle employee selection
  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setManualAttendance({
      ...manualAttendance,
      employeeId: employee._id
    });
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
    console.log("=== Starting manual attendance submission (ADMIN) ===");
    setIsLoading(true);
    
    // Validate input more thoroughly
    if (!manualAttendance.date || !manualAttendance.timeIn || !manualAttendance.status || !manualAttendance.employeeId) {
      console.error("Validation failed - missing fields:", {
        date: manualAttendance.date,
        timeIn: manualAttendance.timeIn,
        status: manualAttendance.status,
        employeeId: manualAttendance.employeeId
      });
      setError("Please fill out all required fields (Employee, Date, Time In, Status)!");
      setIsLoading(false);
      return;
    }
    
    // Get token from localStorage
    const token = localStorage.getItem("token");
    console.log("Token exists:", !!token);
    
    if (!token) {
      console.error("No authentication token found");
      setError("Authentication token not found. Please log in again.");
      setIsLoading(false);
      return;
    }
    
    // Get API base URL
    const baseUrl = localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
    const manualEndpoint = `${baseUrl}/attendance/manual`;
    
    // Prepare the payload with the exact field names the server expects
    const attendancePayload = {
      employeeId: manualAttendance.employeeId, // Keep as employeeId
      date: manualAttendance.date,
      timeIn: manualAttendance.timeIn, // Keep as simple time string
      timeOut: manualAttendance.timeOut || "", // Send empty string if no timeOut
      status: manualAttendance.status
    };
    
    // Prepare request headers
    const requestHeaders = {
      Authorization: `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    console.log("API Endpoint:", manualEndpoint);
    console.log("Original Manual Attendance Data:", manualAttendance);
    console.log("Transformed Payload:", attendancePayload);
    console.log("Request Headers:", requestHeaders);
    console.log("Sending request to:", manualEndpoint);
    
    // Send request to the manual attendance endpoint
    const response = await axios.post(
      manualEndpoint,
      attendancePayload, // Use the transformed payload
      {
        headers: requestHeaders,
        timeout: 10000
      }
    );
    
    console.log("Response Status:", response.status);
    console.log("Response Data:", response.data);
    
    // Handle response - check for success or assume success for 200/201
    const isSuccess = response.data.success !== false && 
                     (response.status === 200 || response.status === 201);
    
    if (isSuccess) {
      console.log("✅ Manual attendance recorded successfully");
      
      // Refresh attendance records
      if (selectedEmployee?._id) {
        await fetchEmployeeAttendance(selectedEmployee._id);
        console.log("Employee attendance history refreshed");
      }
      
      // Reset form and close modal
      setManualAttendance({
        employeeId: selectedEmployee._id,
        date: new Date().toISOString().split('T')[0],
        timeIn: "",
        timeOut: "",
        status: "Present"
      });
      setIsAttendanceModalOpen(false);
      setError("");
      
      // Show success message
      const successMessage = response.data.message || 
                            "Manual attendance record added successfully";
      alert(`Success: ${successMessage}`);
      
    } else {
      console.error("❌ Server returned unsuccessful response:", response.data);
      setError(response.data.message || "Failed to record attendance");
    }
    
  } catch (error) {
    console.error("=== ERROR SUBMITTING MANUAL ATTENDANCE ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    
    if (error.response) {
      console.error("Response Status:", error.response.status);
      console.error("Response Headers:", error.response.headers);
      console.error("Response Data:", error.response.data);
      
      const errorMessage = error.response.data?.message || 
                          `Server error: ${error.response.status}`;
      setError(`Failed to submit attendance: ${errorMessage}`);
      
    } else if (error.request) {
      console.error("Network Error - Request details:", {
        method: error.config?.method,
        url: error.config?.url,
        timeout: error.config?.timeout
      });
      
      setError("Network error: Unable to connect to server. Check your internet connection.");
      
    } else {
      console.error("Request setup error:", error.message);
      setError(`Request failed: ${error.message}`);
    }
    
  } finally {
    setIsLoading(false);
    console.log("=== Manual attendance submission process completed ===");
  }
};

  // Calculate duration between time in and time out in hours
  const calculateDurationInHours = (timeIn, timeOut) => {
    if (timeIn === '-' || timeOut === '-') {
      return 0;
    }
    
    try {
      const inTime = new Date(`01/01/2025 ${timeIn}`);
      const outTime = new Date(`01/01/2025 ${timeOut}`);
      const diffMs = outTime - inTime;
      const hours = diffMs / (1000 * 60 * 60);
      return Math.max(0, hours); // Ensure non-negative
    } catch (err) {
      console.error("Error calculating duration:", err);
      return 0;
    }
  };

  // Calculate duration between time in and time out
  const calculateDuration = (timeIn, timeOut) => {
    if (timeIn === '-' || timeOut === '-') {
      return '-';
    }
    
    try {
      const inTime = new Date(`01/01/2025 ${timeIn}`);
      const outTime = new Date(`01/01/2025 ${timeOut}`);
      const diffMs = outTime - inTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch (err) {
      console.error("Error calculating duration:", err);
      return '-';
    }
  };

  // Calculate payroll for selected employee
  const calculatePayroll = () => {
    if (!selectedEmployee || attendanceRecords.length === 0) {
      setError("No attendance data available for payroll calculation");
      return;
    }

    // Filter records based on date range
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
      return;
    }

    // Calculate total hours worked
    let totalHours = 0;
    filteredRecords.forEach(record => {
      if (record.status === 'Present' || record.status === 'Late') {
        totalHours += calculateDurationInHours(record.timeIn, record.timeOut);
      }
    });

    // Calculate regular and overtime hours
    const regularHours = Math.min(totalHours, payrollSettings.regularHoursLimit);
    const overtimeHours = Math.max(0, totalHours - payrollSettings.regularHoursLimit);

    // Calculate pay
    const regularPay = regularHours * payrollSettings.regularRate;
    const overtimePay = overtimeHours * payrollSettings.overtimeRate;
    const totalPay = regularPay + overtimePay;

    setPayrollData({
      totalHours: totalHours.toFixed(2),
      totalPay: totalPay.toFixed(2),
      overtimeHours: overtimeHours.toFixed(2),
      overtimePay: overtimePay.toFixed(2),
      regularPay: regularPay.toFixed(2),
      regularHours: regularHours.toFixed(2)
    });

    setIsPayrollModalOpen(true);
    setError("");
  };

  // Export attendance data for selected employee to PDF

const exportAttendanceToPDF = () => {
  if (!selectedEmployee || attendanceRecords.length === 0) {
    setError("No attendance data available to export");
    return;
  }

  try {
    // Filter records based on date range
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
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(`Attendance & Payroll Report`, 14, 20);
    
    // Add employee info
    doc.setFontSize(12);
    doc.text(`Employee: ${selectedEmployee.name}`, 14, 35);
    doc.text(`Employee ID: ${selectedEmployee._id}`, 14, 45);
    doc.text(`Period: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`, 14, 55);

    // Prepare table data
    const tableData = filteredRecords.map(record => {
      const hoursWorked = calculateDurationInHours(record.timeIn, record.timeOut);
      const dailyPay = (record.status === 'Present' || record.status === 'Late') 
        ? (hoursWorked * payrollSettings.regularRate).toFixed(2) 
        : '0.00';
      
      return [
        record.date,
        record.timeIn,
        record.timeOut,
        calculateDuration(record.timeIn, record.timeOut),
        record.status,
        hoursWorked.toFixed(2),
        `$${dailyPay}`
      ];
    });

    // Add table - Use autoTable as imported function
    autoTable(doc, {
      head: [['Date', 'Time In', 'Time Out', 'Duration', 'Status', 'Hours', 'Daily Pay']],
      body: tableData,
      startY: 65,
      theme: 'striped',
      styles: { fontSize: 8 }
    });

    // Calculate totals
    const totalHours = filteredRecords.reduce((sum, record) => {
      return sum + calculateDurationInHours(record.timeIn, record.timeOut);
    }, 0);
    const totalPay = totalHours * payrollSettings.regularRate;

    // Add summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total Hours: ${totalHours.toFixed(2)}`, 14, finalY);
    doc.text(`Total Pay: $${totalPay.toFixed(2)}`, 14, finalY + 10);

    // Save the PDF
    const startDateFormatted = new Date(dateRange.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const endDateFormatted = new Date(dateRange.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const fileName = `${selectedEmployee.name.replace(/\s+/g, '_')}_Attendance_Payroll_${startDateFormatted}_to_${endDateFormatted}.pdf`;
    
    doc.save(fileName);
    setError(""); // Clear any previous errors
  } catch (err) {
    console.error("Error exporting attendance data:", err);
    setError(`Failed to export data: ${err.message}`);
  }
};

// Export attendance for all employees by fetching data for each employee
const exportAllAttendanceToPDF = async () => {
  try {
    setIsExporting(true);
    const token = localStorage.getItem("token");
    
    if (!token) {
      setError("Authentication token not found. Please log in again.");
      setIsExporting(false);
      return;
    }
    
    if (!dateRange.startDate || !dateRange.endDate) {
      setError("Please select a date range for the export");
      setIsExporting(false);
      return;
    }
    
    if (employees.length === 0) {
      setError("No employees available to export data");
      setIsExporting(false);
      return;
    }
    
    const allData = [];
    let errorOccurred = false;
    
    // Process employees sequentially
    for (const employee of employees) {
      try {
        const response = await axios.get(`${apiBaseUrl}/attendance/employee/${employee._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        if (response.data.success && Array.isArray(response.data.data)) {
          const startDate = new Date(dateRange.startDate);
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          
          const filteredData = response.data.data
            .filter(record => {
              const recordDate = new Date(record.date);
              return recordDate >= startDate && recordDate <= endDate;
            })
            .map(record => {
              const hoursWorked = calculateDurationInHours(record.timeIn || '-', record.timeOut || '-');
              const dailyPay = (record.status === 'Present' || record.status === 'Late') 
                ? (hoursWorked * payrollSettings.regularRate).toFixed(2) 
                : '0.00';
              
              return [
                new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                employee.name,
                record.timeIn || '-',
                record.timeOut || '-',
                calculateDuration(record.timeIn || '-', record.timeOut || '-'),
                record.status,
                hoursWorked.toFixed(2),
                `$${dailyPay}`
              ];
            });
            
          allData.push(...filteredData);
        }
      } catch (err) {
        console.error(`Error fetching attendance for employee ${employee.name}:`, err);
        errorOccurred = true;
      }
    }
    
    if (allData.length === 0) {
      setError("No attendance records found for the selected date range");
      setIsExporting(false);
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('All Employees Attendance & Payroll Report', 14, 20);
    
    // Add date range
    doc.setFontSize(12);
    const startDateFormatted = new Date(dateRange.startDate).toLocaleDateString();
    const endDateFormatted = new Date(dateRange.endDate).toLocaleDateString();
    doc.text(`Period: ${startDateFormatted} - ${endDateFormatted}`, 14, 35);

    // Add table - Use autoTable as imported function
    autoTable(doc, {
      head: [['Date', 'Employee', 'Time In', 'Time Out', 'Duration', 'Status', 'Hours', 'Pay']],
      body: allData,
      startY: 45,
      theme: 'striped',
      styles: { fontSize: 7 }
    });

    // Save the PDF
    const fileName = `All_Employees_Attendance_Payroll_${new Date(dateRange.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-')}_to_${new Date(dateRange.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-')}.pdf`;
    
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
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Attendance Tracking & Payroll</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Payroll Settings */}
      <div className="bg-blue-50 p-4 rounded-lg shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Payroll Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regular Rate ($/hour)</label>
            <input
              type="number"
              name="regularRate"
              value={payrollSettings.regularRate}
              onChange={handlePayrollSettingsChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Rate ($/hour)</label>
            <input
              type="number"
              name="overtimeRate"
              value={payrollSettings.overtimeRate}
              onChange={handlePayrollSettingsChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regular Hours Limit</label>
            <input
              type="number"
              name="regularHoursLimit"
              value={payrollSettings.regularHoursLimit}
              onChange={handlePayrollSettingsChange}
              min="0"
              step="1"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Export Controls */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Export Attendance & Payroll Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateRangeChange}
              className="w-full px-3 py-2 border rounded"
              max={dateRange.endDate}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateRangeChange}
              className="w-full px-3 py-2 border rounded"
              min={dateRange.startDate}
            />
          </div>
          <div className="col-span-2 flex items-end">
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                onClick={calculatePayroll}
                disabled={!selectedEmployee || attendanceRecords.length === 0}
                className={`${
                  selectedEmployee && attendanceRecords.length > 0
                    ? "bg-purple-500 hover:bg-purple-600" 
                    : "bg-gray-400 cursor-not-allowed"
                } text-white px-3 py-2 rounded-md flex items-center justify-center space-x-1`}
              >
                <Calculator className="h-4 w-4" />
                <span>Calculate Pay</span>
              </button>
              <button
                onClick={exportAttendanceToPDF}
                disabled={!selectedEmployee || attendanceRecords.length === 0}
                className={`${
                  selectedEmployee && attendanceRecords.length > 0
                    ? "bg-blue-500 hover:bg-blue-600" 
                    : "bg-gray-400 cursor-not-allowed"
                } text-white px-3 py-2 rounded-md flex items-center justify-center space-x-1`}
              >
                <Download className="h-4 w-4" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={exportAllAttendanceToPDF}
                disabled={isExporting || employees.length === 0}
                className={`${
                  !isExporting && employees.length > 0
                    ? "bg-green-500 hover:bg-green-600" 
                    : "bg-gray-400 cursor-not-allowed"
                } text-white px-3 py-2 rounded-md flex items-center justify-center space-x-1`}
              >
                {isExporting ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span className="ml-1">Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Export All PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Employee List Sidebar */}
        <div className="bg-white p-4 rounded-lg shadow-md md:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Employees</h2>
          {isLoading && !employees.length ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2">Loading employees...</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {employees.map((employee) => (
                <li 
                  key={employee._id}
                  className={`p-2 mb-1 rounded cursor-pointer ${
                    selectedEmployee && selectedEmployee._id === employee._id 
                      ? 'bg-blue-100 border-l-4 border-blue-500' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleEmployeeSelect(employee)}
                >
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-sm text-gray-500">{employee.email}</div>
                </li>
              ))}
              
              {employees.length === 0 && !isLoading && (
                <p className="text-gray-500 text-center py-4">No employees found</p>
              )}
            </ul>
          )}
        </div>

        {/* Attendance Records */}
        <div className="bg-white p-4 rounded-lg shadow-md md:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {selectedEmployee ? `Attendance for ${selectedEmployee.name}` : "Attendance Records"}
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={handleManualAttendance}
                disabled={!selectedEmployee}
                className={`${
                  selectedEmployee 
                    ? "bg-green-900 hover:bg-green-800" 
                    : "bg-gray-400 cursor-not-allowed"
                } text-white px-4 py-2 rounded-md flex items-center space-x-2`}
              >
                <MousePointerClick className="h-4 w-4" />
                <span>Record Attendance</span>
              </button>
            </div>
          </div>

          {selectedEmployee && (
            <div className="bg-green-50 p-4 mb-6 rounded-lg border border-green-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-green-800">Today's Status</h3>
                <p className="text-green-700">
                  {attendanceRecords.length > 0 && 
                   attendanceRecords[0].rawDate.toDateString() === new Date().toDateString()
                    ? `${attendanceRecords[0].status} - In: ${attendanceRecords[0].timeIn}, Out: ${attendanceRecords[0].timeOut}`
                    : "No record for today"}
                </p>
              </div>
            </div>
          )}

          {selectedEmployee ? (
            <div>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="mt-2">Loading attendance records...</p>
                </div>
              ) : attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
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
                            {calculateDuration(record.timeIn, record.timeOut)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === 'Present' 
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'Late'
                                ? 'bg-yellow-100 text-yellow-800'
                                : record.status === 'Absent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No attendance records found for this employee.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Select an employee to view their attendance records.</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Attendance Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Record Attendance for {selectedEmployee?.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={manualAttendance.date}
                    onChange={handleAttendanceChange}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time In</label>
                  <input
                    type="time"
                    name="timeIn"
                    value={manualAttendance.timeIn}
                    onChange={handleAttendanceChange}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Out</label>
                  <input
                    type="time"
                    name="timeOut"
                    value={manualAttendance.timeOut}
                    onChange={handleAttendanceChange}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={manualAttendance.status}
                    onChange={handleAttendanceChange}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={submitManualAttendance}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {isLoading ? "Saving..." : "Save Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Modal */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Payroll Calculation for {selectedEmployee?.name}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Date Range:</span>
                  <span className="text-sm">{new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium">Regular Hours:</span>
                  <span className="text-sm">{payrollData.regularHours}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium">Overtime Hours:</span>
                  <span className="text-sm">{payrollData.overtimeHours}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t">
                  <span className="text-sm font-medium">Total Hours:</span>
                  <span className="text-sm font-bold">{payrollData.totalHours}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium">Regular Pay:</span>
                  <span className="text-sm">${payrollData.regularPay}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium">Overtime Pay:</span>
                  <span className="text-sm">${payrollData.overtimePay}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t">
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
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceTracking;