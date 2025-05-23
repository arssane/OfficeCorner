import React, { useState, useEffect } from "react";
import axios from "axios";
import { MousePointerClick, Download } from "lucide-react";
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
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }
      
      const response = await axios.get(`${apiBaseUrl}/employee`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 10000
      });
      
      setEmployees(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching employees:", err);
      
      if (err.response) {
        if (err.response.status === 404) {
          setError(`API endpoint not found. Please check if the server is running and the endpoint path is correct.`);
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

  // Fetch attendance records for a specific employee
  const fetchEmployeeAttendance = async (employeeId) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }
      
      const response = await axios.get(`${apiBaseUrl}/attendance/employee/${employeeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      // Check if the response has a success flag and data property
      if (response.data.success && Array.isArray(response.data.data)) {
        const formattedAttendance = response.data.data.map(record => ({
          date: new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          rawDate: new Date(record.date), // Store raw date for sorting and filtering
          timeIn: record.timeIn || '-',
          timeOut: record.timeOut || '-',
          status: record.status,
          // Store original record data for export
          originalData: record
        }));
        
        // Sort by date (newest first)
        formattedAttendance.sort((a, b) => b.rawDate - a.rawDate);
        
        setAttendanceRecords(formattedAttendance);
        setError("");
      } else {
        console.error("Unexpected API response format:", response.data);
        setError("Received invalid data format from server");
      }
    } catch (err) {
      console.error("Error fetching attendance records:", err);
      
      if (err.response) {
        setError(`Failed to fetch attendance: ${err.response.data.message || err.message}`);
      } else if (err.request) {
        setError("No response from server. Please check if the server is running.");
      } else {
        setError(`Error: ${err.message}`);
      }
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
      
      // Validate input
      if (!manualAttendance.date || !manualAttendance.timeIn || !manualAttendance.status) {
        setError("Please fill out all required fields!");
        setIsLoading(false);
        return;
      }
      
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }
      
      // Send request to add attendance
      await axios.post(
        `${apiBaseUrl}/attendance`,
        manualAttendance,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      // Refresh attendance records
      fetchEmployeeAttendance(selectedEmployee._id);
      
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
    } catch (err) {
      console.error("Error adding attendance record:", err);
      
      if (err.response) {
        setError(err.response.data.message || "Failed to add attendance record.");
      } else if (err.request) {
        setError("No response from server. Please check if the server is running.");
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
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

  // Export attendance data for selected employee to CSV
  const exportAttendanceToCSV = () => {
    if (!selectedEmployee || attendanceRecords.length === 0) {
      setError("No attendance data available to export");
      return;
    }

    try {
      // Filter records based on date range if specified
      let filteredRecords = [...attendanceRecords];
      
      if (dateRange.startDate && dateRange.endDate) {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999); // Set to end of day
        
        filteredRecords = filteredRecords.filter(record => {
          return record.rawDate >= startDate && record.rawDate <= endDate;
        });
      }
      
      if (filteredRecords.length === 0) {
        setError("No records found in the selected date range");
        return;
      }

      // CSV Header
      const csvHeader = [
        "Date",
        "Employee Name",
        "Employee ID",
        "Time In",
        "Time Out",
        "Status",
        "Duration"
      ];

      // CSV Rows
      const csvRows = filteredRecords.map(record => {
        return [
          record.date,
          selectedEmployee.name,
          selectedEmployee._id,
          record.timeIn,
          record.timeOut,
          record.status,
          calculateDuration(record.timeIn, record.timeOut)
        ];
      });

      // Combine header and rows
      const csvContent = [
        csvHeader.join(","),
        ...csvRows.map(row => row.join(","))
      ].join("\n");

      // Create a Blob and download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      // Set file name with employee name and date range
      const startDateFormatted = new Date(dateRange.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const endDateFormatted = new Date(dateRange.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const fileName = `${selectedEmployee.name.replace(/\s+/g, '_')}_Attendance_${startDateFormatted}_to_${endDateFormatted}.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting attendance data:", err);
      setError(`Failed to export data: ${err.message}`);
    }
  };

  // Export attendance for all employees by fetching data for each employee
  const exportAllAttendanceToCSV = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsExporting(false);
        return;
      }
      
      // Validate date range
      if (!dateRange.startDate || !dateRange.endDate) {
        setError("Please select a date range for the export");
        setIsExporting(false);
        return;
      }
      
      // Validate employees list
      if (employees.length === 0) {
        setError("No employees available to export data");
        setIsExporting(false);
        return;
      }
      
      // Collect attendance data for all employees
      const allData = [];
      let errorOccurred = false;
      
      // Process employees sequentially to avoid overwhelming the server
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
            endDate.setHours(23, 59, 59, 999); // Set to end of day
            
            // Filter by date range and format the data
            const filteredData = response.data.data
              .filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= startDate && recordDate <= endDate;
              })
              .map(record => ({
                date: new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                employeeName: employee.name,
                employeeId: employee._id,
                timeIn: record.timeIn || '-',
                timeOut: record.timeOut || '-',
                status: record.status,
                duration: calculateDuration(record.timeIn || '-', record.timeOut || '-')
              }));
              
            allData.push(...filteredData);
          }
        } catch (err) {
          console.error(`Error fetching attendance for employee ${employee.name}:`, err);
          errorOccurred = true;
          // Continue with next employee rather than stopping the whole process
        }
      }
      
      if (allData.length === 0) {
        setError("No attendance records found for the selected date range");
        setIsExporting(false);
        return;
      }
      
      // CSV Header
      const csvHeader = [
        "Date",
        "Employee Name",
        "Employee ID",
        "Time In",
        "Time Out",
        "Status",
        "Duration"
      ];
      
      // CSV Rows
      const csvRows = allData.map(record => {
        return [
          record.date,
          record.employeeName,
          record.employeeId,
          record.timeIn,
          record.timeOut,
          record.status,
          record.duration
        ];
      });
      
      // Combine header and rows
      const csvContent = [
        csvHeader.join(","),
        ...csvRows.map(row => row.join(","))
      ].join("\n");
      
      // Create a Blob and download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      // Set file name with date range
      const startDateFormatted = new Date(dateRange.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const endDateFormatted = new Date(dateRange.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const fileName = `All_Employees_Attendance_${startDateFormatted}_to_${endDateFormatted}.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
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
          <button
        onClick={() => navigate(-1)} // This goes to the previous page
        className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-400 transition duration-300 mb-4"
      >
        ← Back
      </button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Attendance Tracking</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Export Controls */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Export Attendance Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="col-span-1 flex items-end">
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                onClick={exportAttendanceToCSV}
                disabled={!selectedEmployee || attendanceRecords.length === 0}
                className={`${
                  selectedEmployee && attendanceRecords.length > 0
                    ? "bg-blue-500 hover:bg-blue-600" 
                    : "bg-gray-400 cursor-not-allowed"
                } text-white px-3 py-2 rounded-md flex items-center justify-center space-x-1`}
              >
                <Download className="h-4 w-4" />
                <span>Export Selected</span>
              </button>
              <button
                onClick={exportAllAttendanceToCSV}
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
                    <span>Export All</span>
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
                   attendanceRecords[0].date === new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    ? attendanceRecords[0].timeOut !== '-'
                      ? `Clocked in at ${attendanceRecords[0].timeIn} and clocked out at ${attendanceRecords[0].timeOut}`
                      : `Clocked in at ${attendanceRecords[0].timeIn}`
                    : "No clock-in record for today"}
                </p>
              </div>
              
              <div className="text-green-800 text-sm bg-white px-4 py-2 rounded-md border border-green-200">
                Current Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {isLoading && selectedEmployee ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2">Loading attendance data...</p>
            </div>
          ) : selectedEmployee ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceRecords.length > 0 ? (
                    attendanceRecords.map((record, index) => (
                      <tr key={index}>
                        <td className="py-4 px-4 text-sm text-gray-900">{record.date}</td>
                        <td className="py-4 px-4 text-sm text-gray-500">{record.timeIn}</td>
                        <td className="py-4 px-4 text-sm text-gray-500">{record.timeOut}</td>
                        <td className="py-4 px-4 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                            ${record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                              record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' : 
                              record.status === 'Absent' ? 'bg-red-100 text-red-800' : 
                              'bg-blue-100 text-blue-800'}`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500">
                          {calculateDuration(record.timeIn, record.timeOut)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-gray-500">
                        No attendance records found for this employee
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Select an employee to view attendance records</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Attendance Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Record Attendance for {selectedEmployee?.name}</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Date</label>
              <input
                type="date"
                name="date"
                value={manualAttendance.date}
                onChange={handleAttendanceChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Time In</label>
              <input
                type="time"
                name="timeIn"
                value={manualAttendance.timeIn}
                onChange={handleAttendanceChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Time Out (optional)</label>
              <input
                type="time"
                name="timeOut"
                value={manualAttendance.timeOut}
                onChange={handleAttendanceChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={manualAttendance.status}
                onChange={handleAttendanceChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Vacation">Vacation</option>
                <option value="Sick">Sick</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => setIsAttendanceModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={submitManualAttendance}
                disabled={isLoading}
              >
                {isLoading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceTracking;