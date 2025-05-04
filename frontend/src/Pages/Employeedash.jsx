import React, { useState, useEffect } from 'react';
import { Calendar, MousePointerClick } from 'lucide-react';
import axios from 'axios';

const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  
  // Define fallback data outside of the functions but within component scope
  const fallbackEmployee = {
    id: localStorage.getItem("employeeId") || "fallback-employee-id",
    name: localStorage.getItem("employeeName") || "Employee",
    email: localStorage.getItem("employeeEmail") || "employee@example.com",
    department: localStorage.getItem("employeeDepartment") || "General",
    position: localStorage.getItem("employeePosition") || "Staff"
  };
  
  const fallbackTasks = [
    { id: 1, title: "Complete quarterly report", description: "Finish the Q1 financial report", deadline: "2025-04-15", priority: "high", status: "pending", assignedTo: fallbackEmployee.id },
    { id: 2, title: "Review marketing materials", description: "Check new campaign visuals", deadline: "2025-04-10", priority: "medium", status: "in-progress", assignedTo: fallbackEmployee.id },
    { id: 3, title: "Update employee handbook", description: "Add new policies and procedures", deadline: "2025-04-30", priority: "low", status: "pending", assignedTo: fallbackEmployee.id }
  ];
  
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
  
  // Get the task endpoint - prefer stored working endpoint if available
  const getTaskEndpoint = () => {
    const storedEndpoint = localStorage.getItem("taskEndpoint");
    if (storedEndpoint) return storedEndpoint;
    
    const baseUrl = localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
    return `${baseUrl}/tasks`; // Default
  };

  // Get the employee profile endpoint
  const getEmployeeProfileEndpoint = () => {
    const storedBaseUrl = localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
    return `${storedBaseUrl}/employee/profile`;
  };

  // Fetch current employee profile
  const fetchEmployeeProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("Authentication token not found");
        // Try to get user data from localStorage if available
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser) {
          setCurrentEmployee({
            id: storedUser.id || storedUser._id,
            name: storedUser.name,
            email: storedUser.email,
            department: storedUser.department || 'General',
            position: storedUser.position || 'Staff'
          });
        } else {
          setCurrentEmployee(fallbackEmployee);
        }
        return;
      }
      
      setLoading(true);
      
      const response = await axios.get(getEmployeeProfileEndpoint(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.data) {
        const employeeData = response.data;
        setCurrentEmployee({
          id: employeeData.id || employeeData._id,
          name: employeeData.name,
          email: employeeData.email,
          department: employeeData.department || 'General',
          position: employeeData.position || 'Staff'
        });
      }
    } catch (err) {
      console.error("Error fetching employee profile:", err);
      // Fall back to localStorage data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser) {
        setCurrentEmployee({
          id: storedUser.id || storedUser._id,
          name: storedUser.name,
          email: storedUser.email,
          department: storedUser.department || 'General',
          position: storedUser.position || 'Staff'
        });
      } else {
        setCurrentEmployee(fallbackEmployee);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks assigned to the current employee
  // Update the fetchEmployeeTasks function
const fetchEmployeeTasks = async (employeeId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("Authentication token not found. Using fallback task data.");
      setTasks(fallbackTasks);
      return;
    }

    setLoading(true);
    
    const response = await axios.get(getTaskEndpoint(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      },
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.status >= 200 && response.status < 300) {
      console.log("All tasks:", response.data);
      
      // Improved task extraction logic
      let allTasks = [];
      if (Array.isArray(response.data)) {
        allTasks = response.data;
      } else if (response.data?.tasks && Array.isArray(response.data.tasks)) {
        allTasks = response.data.tasks;
      } else if (response.data && typeof response.data === 'object') {
        // Try to find any array in the response object
        const possibleTasks = Object.values(response.data).find(val => Array.isArray(val));
        allTasks = possibleTasks || [];
      }

      // If we couldn't get any tasks, use fallback
      if (allTasks.length === 0) {
        console.warn("No tasks array found in response. Using fallback tasks.");
        setTasks(fallbackTasks);
        return;
      }

      // If employee profile failed to load, just show all tasks
      if (!employeeId || employeeId === "fallback-employee-id") {
        console.warn("No valid employee ID. Showing all tasks.");
        setTasks(allTasks);
        return;
      }

      // More flexible task filtering
      const employeeTasks = allTasks.filter(task => {
        // Try all possible fields where assigned employee might be stored
        const taskAssignedTo = task.assignedTo || task.assigned_to || task.employeeId || 
                             task.employee_id || task.employee?.id || task.employee?._id;
        
        // If no assignment info exists, include the task
        if (!taskAssignedTo) return true;
        
        // Compare with employee ID
        return taskAssignedTo.toString() === employeeId.toString();
      });

      console.log("Filtered employee tasks:", employeeTasks);
      
      // If we found tasks for employee, show them, otherwise show all tasks with a warning
      if (employeeTasks.length > 0) {
        setTasks(employeeTasks);
      } else {
        console.warn("No tasks matched employee ID. Showing all available tasks.");
        setTasks(allTasks);
      }
      
      setError(null);
    } else {
      console.error(`Failed to fetch tasks: ${response.status} - ${response.statusText}`);
      setTasks(fallbackTasks);
    }
  } catch (err) {
    console.error("Error fetching employee tasks:", err);
    setTasks(fallbackTasks);
  } finally {
    setLoading(false);
  }
};

  // Initialize data fetching
  useEffect(() => {
    fetchEmployeeProfile();
    
    // Set up an interval to refresh tasks periodically
    const refreshInterval = setInterval(() => {
      if (currentEmployee) {
        fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
      }
    }, 60000); // Refresh every minute
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Handle manual attendance
  const handleManualAttendance = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Authentication token not found. Please log in again.");
        return;
      }
    
      // Get the API endpoint
      const baseUrl = localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
      const attendanceEndpoint = `${baseUrl}/attendance/record`;
      
      // Get employee ID
      const employeeId = currentEmployee?.id || localStorage.getItem("employeeId");
      if (!employeeId) {
        alert("Employee ID not found. Please log in again.");
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      // Send request to record attendance
      const response = await axios.post(attendanceEndpoint, 
        { employeeId }, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        // Update the local attendance history with the new record
        fetchAttendanceHistory(employeeId);
        alert(`Attendance recorded: ${response.data.message}`);
      } else {
        alert(response.data.message || "Failed to record attendance");
      }
    } catch (error) {
      console.error("Error recording attendance:", error);
      
      // Fallback to local attendance recording if API fails
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      // Check if we have an entry for today
      const todayEntry = attendanceHistory.find(entry => entry.date === today);
      
      if (!todayEntry) {
        // Clock in - new day
        const newAttendance = [
          { date: today, timeIn: currentTime, timeOut: '-', status: 'Present' },
          ...attendanceHistory
        ];
        setAttendanceHistory(newAttendance);
        alert(`Attendance recorded locally: Clocked In at ${currentTime}`);
      } else if (todayEntry.timeOut === '-') {
        // Clock out
        const updatedHistory = attendanceHistory.map(entry => 
          entry.date === today ? { ...entry, timeOut: currentTime } : entry
        );
        setAttendanceHistory(updatedHistory);
        alert(`Attendance recorded locally: Clocked Out at ${currentTime}`);
      } else {
        // Already clocked in and out
        alert("You've already completed attendance for today");
      }
      
      // Show error notification
      alert("Note: Connection to server failed. Attendance recorded locally only.");
    } finally {
      setLoading(false);
    }
  };

// Add a new function to fetch attendance history
const fetchAttendanceHistory = async (employeeId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("Authentication token not found");
      return;
    }
    
    setLoading(true);
    
    // Get the API endpoint
    const baseUrl = localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
    const historyEndpoint = `${baseUrl}/attendance/employee/${employeeId}`;
    
    const response = await axios.get(historyEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data.success) {
      setAttendanceHistory(response.data.data);
      setError(null);
    } else {
      console.error('Failed to fetch attendance history:', response.data.message);
    }
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    // Keep using local data, don't reset it
  } finally {
    setLoading(false);
  }
};

// Update the useEffect to fetch attendance history
useEffect(() => {
  fetchEmployeeProfile();
  
  // Set up an interval to refresh tasks periodically
  const refreshInterval = setInterval(() => {
    if (currentEmployee) {
      fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
      fetchAttendanceHistory(currentEmployee.id || currentEmployee._id);
    }
  }, 60000); // Refresh every minute
  
  return () => clearInterval(refreshInterval);
}, []);

// Add another useEffect to fetch attendance once employee profile is loaded
useEffect(() => {
  if (currentEmployee) {
    fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
    fetchAttendanceHistory(currentEmployee.id || currentEmployee._id);
  }
}, [currentEmployee]);

  // Update task status - for completing tasks from the dashboard
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      // Find the task to update
      const taskToUpdate = tasks.find(task => task.id === taskId || task._id === taskId);
      if (!taskToUpdate) return;
      
      // Create the updated task object
      const updatedTask = {
        ...taskToUpdate,
        status: newStatus
      };
      
      // Optimistically update the UI first
      setTasks(tasks.map(task => 
        (task.id === taskId || task._id === taskId) ? {...task, status: newStatus} : task
      ));
      
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Authentication token not found. Please log in first.");
        return;
      }
      
      const taskEndpoint = getTaskEndpoint();
      let updateEndpoint;
      
      if (taskEndpoint.endsWith('s')) {
        // For endpoints like /api/tasks
        updateEndpoint = `${taskEndpoint}/${taskId}`;
      } else {
        // For endpoints like /api/task
        updateEndpoint = `${taskEndpoint}/${taskId}`;
      }
      
      const response = await axios.put(updateEndpoint, updatedTask, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      if (response.status >= 200 && response.status < 300) {
        alert(`Task marked as ${newStatus}`);
      } else {
        // The UI was already updated, but we'll log the error
        console.error(`API error when updating task: ${response.status} - ${response.statusText}`);
        alert(`Note: Task was updated locally but not on the server. You may need to refresh.`);
      }
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Task updated locally but there was an error communicating with the server.");
    }
  };

  // Get today's date
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString; // If parsing fails, return the original string
    }
  };
  
  // Generate calendar days grid
  const generateCalendarDays = () => {
    const days = [];
    const eventDays = events.map(event => event.date);
    
    // Get current month days
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `Mar ${i}, 2025`;
      const hasEvent = eventDays.includes(dateStr);
      const isToday = i === currentDate.getDate();
      
      days.push(
        <div 
          key={i} 
          className={`h-12 flex flex-col justify-center items-center rounded-md cursor-pointer hover:bg-gray-100
            ${isToday ? 'bg-blue-100 font-bold text-blue-600' : ''}
            ${hasEvent ? 'border-2 border-blue-400' : ''}
          `}
        >
          <span>{i}</span>
          {hasEvent && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>}
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-green-900 shadow-lg">
  <div className="container mx-auto px-6 py-4 flex justify-between items-center">
    <div className="flex items-center cursor-pointer">
      <h1 className="text-2xl text-white font-bold" onClick={() => window.location.href = "/"}>OfficeCorner</h1>
      <span className="ml-2 bg-green-700 text-xs text-blue-100 px-2 py-1 rounded-full">
        {currentEmployee ? 
          (currentEmployee.department || 'General').toUpperCase() : 
          'EMPLOYEE'
        }
      </span>
    </div>
    <div className="flex items-center space-x-4">
      <div className="hidden md:flex items-center text-white text-sm mr-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{today}</span>
      </div>
      <div className="relative group">
        <button className="flex items-center space-x-2 bg-green-700 bg-opacity-50 text-white px-4 py-2 rounded-lg hover:bg-opacity-70 transition">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-medium">
            {currentEmployee ? 
              (currentEmployee.name || 'Employee').charAt(0).toUpperCase() : 
              "E"
            }
          </div>
          <span className="hidden md:inline">
            {currentEmployee ? 
              (currentEmployee.name || 'Employee') : 
              "Employee"
            }
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block">
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium text-gray-900">
              {currentEmployee ? 
                (currentEmployee.name || 'Employee') : 
                'Employee'
              }
            </p>
            <p className="text-xs text-gray-500 truncate">
              {currentEmployee ? 
                (currentEmployee.email || 'employee@example.com') : 
                'employee@example.com'
              }
            </p>
            {currentEmployee && (
              <p className="text-xs text-gray-500 mt-1">
                {currentEmployee.position || 'Staff'} - {currentEmployee.department || 'General'}
              </p>
            )}
          </div>
          <a href="#" className="block px-4 py-2 text-gray-800 hover:bg-gray-50 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Profile
          </a>
          <a href="#" className="block px-4 py-2 text-gray-800 hover:bg-gray-50 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </a>
          <div className="border-t border-gray-100 my-1"></div>
          <a href="#" onClick={() => window.location.href = "/"} className="block px-4 py-2 text-red-600 hover:bg-gray-50 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </a>
        </div>
      </div>
    </div>
  </div>
</header>

      {/* Tabs */}
      <div className="container mx-auto px-6">
        <div className="mt-6 mb-6 border-b">
          <div className="flex space-x-8 pt-4">
            <button 
              onClick={() => setActiveTab('tasks')} 
              className={`pb-3 px-4 text-lg transition-all duration-200 rounded-t-lg ${
                activeTab === 'tasks' 
                  ? 'border-b-2 border-green-900 font-medium bg-gradient-to-r from-green-50 to-green-100 text-green-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Tasks
            </button>
            <button 
              onClick={() => setActiveTab('attendance')} 
              className={`pb-3 px-4 text-lg transition-all duration-200 rounded-t-lg ${
                activeTab === 'attendance' 
                  ? 'border-b-2 border-green-900 font-medium bg-gradient-to-r from-green-50 to-green-100 text-green-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Attendance
            </button>
            <button 
              onClick={() => setActiveTab('calendar')} 
              className={`pb-3 px-4 text-lg transition-all duration-200 rounded-t-lg ${
                activeTab === 'calendar' 
                  ? 'border-b-2 border-green-900 font-medium bg-gradient-to-r from-green-50 to-green-100 text-green-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Calendar & Events
            </button>
          </div>
        </div>
        
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">My Tasks</h2>
              <div className="flex space-x-2">
                <select className="border rounded-md px-3 py-1 text-sm bg-white">
                  <option value="">All Tasks</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <select className="border rounded-md px-3 py-1 text-sm bg-white">
                  <option value="">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button 
                  onClick={() => {
                    if (currentEmployee) {
                      fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
                    }
                  }}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-md hover:bg-green-200"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading your tasks...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">No tasks assigned to you</td>
                      </tr>
                    ) : (
                      tasks.map(task => (
                        <tr key={task.id || task._id}>
                          <td className="py-4 px-4 text-sm text-gray-900">{task.title}</td>
                          <td className="py-4 px-4 text-sm text-gray-500">{task.description}</td>
                          <td className="py-4 px-4 text-sm text-gray-500">{formatDate(task.deadline)}</td>
                          <td className="py-4 px-4 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                              ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-green-100 text-green-800'}`}
                            >
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                              ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                                'bg-gray-100 text-gray-800'}`}
                            >
                              {task.status === 'in-progress' ? 'In Progress' : 
                                task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800" 
                               onClick={() => {
                                setSelectedTask(task);
                                setIsModalOpen(true);
                              }}>
                                View
                              </button>
                              {task.status === 'pending' && (
                                <button 
                                  className="text-blue-600 hover:text-blue-800"
                                  onClick={() => updateTaskStatus(task.id || task._id, 'in-progress')}
                                >
                                  Start
                                </button>
                              )}
                              {task.status !== 'completed' && (
                                <button 
                                  className="text-green-600 hover:text-green-800"
                                  onClick={() => updateTaskStatus(task.id || task._id, 'completed')}
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Attendance Records</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={handleManualAttendance}
                  className="bg-green-900 hover:bg-green-800 text-white px-4 py-2 rounded-md flex items-center space-x-2"
                >
                  <MousePointerClick className="h-4 w-4" />
                  <span>Record Attendance</span>
                </button>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 mb-6 rounded-lg border border-green-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-green-800">Today's Status</h3>
                <p className="text-green-700">
                  {attendanceHistory.length > 0 && attendanceHistory[0].date === new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    ? attendanceHistory[0].timeOut !== '-'
                      ? `Clocked in at ${attendanceHistory[0].timeIn} and clocked out at ${attendanceHistory[0].timeOut}`
                      : `Clocked in at ${attendanceHistory[0].timeIn}`
                    : "You haven't clocked in today"}
                </p>
              </div>
              
              <div className="text-green-800 text-sm bg-white px-4 py-2 rounded-md border border-green-200">
                Current Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

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
                  {attendanceHistory.map((record, index) => (
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
                        {record.timeIn !== '-' && record.timeOut !== '-' ? 
                          (() => {
                            // Calculate duration
                            const timeIn = new Date(`01/01/2025 ${record.timeIn}`);
                            const timeOut = new Date(`01/01/2025 ${record.timeOut}`);
                            const diffMs = timeOut - timeIn;
                            const hours = Math.floor(diffMs / (1000 * 60 * 60));
                            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            return `${hours}h ${minutes}m`;
                          })() : 
                          record.status === 'Vacation' || record.status === 'Sick' ? 
                            'Full day' : 
                            record.timeIn !== '-' ? 
                              'In progress' : 
                              '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Calendar & Events</h2>
              <div className="flex space-x-2">
                <select className="border rounded-md px-3 py-1 text-sm bg-white">
                  <option value="March">March 2025</option>
                  <option value="April">April 2025</option>
                  <option value="May">May 2025</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calendar Grid */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-lg">March 2025</h3>
                    <div className="flex space-x-2">
                      <button className="p-1 rounded hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button className="p-1 rounded hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays()}
                  </div>
                </div>
              </div>
              
              {/* Upcoming Events */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h3 className="font-medium text-lg">Upcoming Events</h3>
                </div>
                
                <div className="p-4">
                  <div className="space-y-4">
                    {events.map(event => (
                      <div key={event.id} className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                        <h4 className="font-medium text-blue-600">{event.title}</h4>
                        <div className="mt-2 flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          {event.date} • {event.time}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.location}
                        </div>
                      </div>
                    ))}
                    
                    {events.length === 0 && (
                      <div className="text-center py-8 text-gray-500">No upcoming events</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <footer className="mt-auto py-6">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              &copy; 2025 OfficeCorner. All rights reserved.
            </div>
            <div className="text-sm text-gray-500">
              Version 2.5.0
            </div>
          </div>
        </div>
      </footer>
      {isModalOpen && selectedTask && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
    <h3 className="text-2xl font-semibold mb-6 text-green-900 border-b-2 border-green-300 pb-2">Task Details</h3>
<div className="space-y-4 text-sm text-gray-800">
  <p className="flex items-center"><strong className="w-20 text-green-700">Title:</strong> {selectedTask.title}</p>
  <p className="flex items-center"><strong className="w-20 text-green-700">Description:</strong> {selectedTask.description}</p>
  <p className="flex items-center"><strong className="w-20 text-green-700">Deadline:</strong> {formatDate(selectedTask.deadline)}</p>
  <p className="flex items-center"><strong className="w-20 text-green-700">Priority:</strong> {selectedTask.priority}</p>
  <p className="flex items-center"><strong className="w-20 text-green-700">Status:</strong> {selectedTask.status}</p>
  {/* <p className="flex items-center"><strong className="w-20 text-green-700">Assigned To:</strong> {selectedTask.assignedTo || "N/A"}</p> */}
</div>
      <div className="mt-4 text-right">
        <button
          onClick={() => setIsModalOpen(false)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
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