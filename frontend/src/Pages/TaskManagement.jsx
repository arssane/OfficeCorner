import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaSync, FaPlus, FaClock, FaUser, FaFlag, FaCheck, FaPaperclip, FaUpload, FaTimesCircle } from "react-icons/fa"; // Added FaPaperclip, FaUpload, FaTimesCircle

const TaskManagement = () => {
  // Initialize state from localStorage if available
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('tasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [employees, setEmployees] = useState(() => {
    const savedEmployees = localStorage.getItem('employees');
    return savedEmployees ? JSON.parse(savedEmployees) : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiBaseUrls] = useState([
    "http://localhost:5000/api",
    "http://localhost:5000",
    "http://localhost:3000/api",
    "http://localhost:3000"
  ]);
  const [currentApiBaseUrl, setCurrentApiBaseUrl] = useState(() => {
    return localStorage.getItem('apiBaseUrl') || "http://localhost:5000/api";
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => {
    const saved = localStorage.getItem('lastUpdated');
    return saved ? saved : null;
  });
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    deadline: "",
    priority: "medium",
    assignedTo: "",
    status: "pending",
    assignedFile: null, // New state for assigned file URL
  });

  const [assignedFile, setAssignedFile] = useState(null); // For handling the file object to upload
  const [uploadingFile, setUploadingFile] = useState(false); // To show loading state for file upload


  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    const currentTime = new Date().toISOString();
    localStorage.setItem('lastUpdated', currentTime);
    setLastUpdated(currentTime);
  }, [tasks]);

  // Save employees to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    initializeData();
    
    // Set up periodic refresh for authenticated users
    const refreshInterval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token && isAuthenticated) {
        console.log('Periodic refresh triggered');
        fetchTasks(token);
        if (employees.length === 0) {
          fetchEmployees(token);
        }
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, employees.length]); // Add isAuthenticated and employees.length to dependencies

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem("token");
      if (token) {
        fetchData(token);  // Always fetch latest data from backend
      }
    } else {
      // If not authenticated, ensure tasks are loaded from local storage
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
      setLoading(false); // Ensure loading state is cleared
    }
  }, [isAuthenticated]);


  const initializeData = async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      // No token, just show cached data
      setIsAuthenticated(false);
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks)); // Ensure tasks are loaded from local storage
      }
      if (tasks.length === 0 && (!savedTasks || JSON.parse(savedTasks).length === 0)) {
        setError("Not logged in. Please log in to fetch tasks.");
      } else {
        setError("Not logged in. Showing cached tasks.");
      }
      setLoading(false);
      return;
    }
    
    setIsAuthenticated(true);
    
    // Try to fetch fresh data, but don't clear existing data on failure
    try {
      await fetchData(token);
    } catch (err) {
      console.log("Failed to fetch fresh data:", err);
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks)); // Fallback to local storage on fetch failure
      }
      if (tasks.length === 0 && (!savedTasks || JSON.parse(savedTasks).length === 0)) {
        setError("Failed to sync with server. No cached tasks available.");
      } else {
        setError("Failed to sync with server. Showing cached tasks.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Check API endpoint and try options
  const checkEndpoints = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in first.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError("Checking API endpoints...");
      
      for (const baseUrl of apiBaseUrls) {
        console.log(`Trying base URL: ${baseUrl}`);
        
        const taskEndpoints = [
          `${baseUrl}/tasks`,
          `${baseUrl}/task`,
          `${baseUrl}/api/tasks`, 
          `${baseUrl}/api/task`
        ];
        
        // Updated employee/user endpoints
        const employeeEndpoints = [
          `${baseUrl}/auth/users`,
          `${baseUrl}/users`,
          `${baseUrl}/api/users`,
          `${baseUrl}/api/auth/users`,
          `${baseUrl}/employee`,
          `${baseUrl}/employees`,
          `${baseUrl}/api/employees`,
          `${baseUrl}/api/employee`
        ];
        
        // Try task endpoints with this base URL
        let tasksData = null;
        let workingTaskEndpoint = null;
        
        for (const endpoint of taskEndpoints) {
          try {
            console.log(`Trying task endpoint: ${endpoint}`);
            const response = await fetch(endpoint, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
              },
              signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
              tasksData = await response.json();
              workingTaskEndpoint = endpoint;
              console.log(`Found working task endpoint: ${endpoint}`);
              setCurrentApiBaseUrl(baseUrl);
              localStorage.setItem("apiBaseUrl", baseUrl);
              break;
            }
          } catch (err) {
            console.log(`Endpoint ${endpoint} failed:`, err.message);
          }
        }
        
        if (workingTaskEndpoint) {
          let employeesData = null;
          let workingEmployeeEndpoint = null;
          
          for (const endpoint of employeeEndpoints) {
            try {
              console.log(`Trying employee endpoint: ${endpoint}`);
              const response = await fetch(endpoint, {
                headers: { 
                  Authorization: `Bearer ${token}`,
                  'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000)
              });
              
              if (response.ok) {
                const rawData = await response.json();
                console.log(`Raw employee data from ${endpoint}:`, rawData);
                
                // Handle different response structures
                if (Array.isArray(rawData)) {
                  employeesData = rawData;
                } else if (rawData.users && Array.isArray(rawData.users)) {
                  employeesData = rawData.users;
                } else if (rawData.data && Array.isArray(rawData.data)) {
                  employeesData = rawData.data;
                }
                
                if (employeesData && employeesData.length > 0) {
                  workingEmployeeEndpoint = endpoint;
                  console.log(`Found working employee endpoint: ${endpoint}`, employeesData);
                  break;
                }
              }
            } catch (err) {
              console.log(`Endpoint ${endpoint} failed:`, err.message);
            }
          }
          
          if (workingTaskEndpoint) {
            localStorage.setItem("taskEndpoint", workingTaskEndpoint);
            // Update tasks with server data
            if (tasksData) {
              const taskArray = Array.isArray(tasksData) ? tasksData : [];
              setTasks(taskArray);
            }
          }
          
          if (workingEmployeeEndpoint && employeesData) {
            localStorage.setItem("employeeEndpoint", workingEmployeeEndpoint);
            
            // Process employees to ensure consistent structure
            const processedEmployees = employeesData.map(emp => ({
              _id: emp._id || emp.id,
              id: emp.id || emp._id,
              name: emp.name || emp.username || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
              username: emp.username,
              email: emp.email,
              role: emp.role // Assuming the API returns a 'role' field
            }));
            
            setEmployees(processedEmployees);
            localStorage.setItem('employees', JSON.stringify(processedEmployees));
            console.log('Processed employees:', processedEmployees);
          }
          
          setError(null);
          setLoading(false);
          return;
        }
      }
      
      setError("Could not find any working API endpoints. Using cached data.");
      // Ensure tasks are loaded from local storage if API endpoints are not found
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch (err) {
      setError(`API endpoint check failed: ${err.message}. Using cached data.`);
      // Ensure tasks are loaded from local storage on error
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if the user is authenticated
  const checkAuthentication = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication token not found. Showing cached tasks.");
      setIsAuthenticated(false);
      setLoading(false);
      // Ensure tasks are loaded from local storage when not authenticated
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } else {
      const storedBaseUrl = localStorage.getItem("apiBaseUrl");
      if (storedBaseUrl) {
        setCurrentApiBaseUrl(storedBaseUrl);
      }
      setIsAuthenticated(true);
      fetchData(token);
    }
  };

  // Fetch tasks and employees with the provided token
  const fetchData = (token) => {
    fetchTasks(token);
    fetchEmployees(token);
  };

  // Get the task endpoint
  const getTaskEndpoint = () => {
    const storedEndpoint = localStorage.getItem("taskEndpoint");
    return storedEndpoint || `${currentApiBaseUrl}/tasks`;
  };

  // Get the employee endpoint
  const getEmployeeEndpoint = () => {
    const storedEndpoint = localStorage.getItem("employeeEndpoint");
    return storedEndpoint || `${currentApiBaseUrl}/users`;
  };

  // Fetch tasks with token
 const fetchTasks = async (token) => {
    try {
      setLoading(true);
      
      const response = await fetch(getTaskEndpoint(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const tasksData = await response.json();
        console.log('Raw tasks response:', tasksData);
        
        let taskArray = [];
        
        // Handle different response structures
        if (Array.isArray(tasksData)) {
          taskArray = tasksData;
        } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
          taskArray = tasksData.tasks;
        } else if (tasksData.data && Array.isArray(tasksData.data)) {
          taskArray = tasksData.data;
        }
        
        console.log('Processed task array:', taskArray);
        console.log('Current tasks count:', tasks.length);
        
        // CRITICAL FIX: Only update tasks if we got meaningful data
        // Don't overwrite existing tasks with empty array unless we're sure that's correct
        if (taskArray.length > 0 || tasks.length === 0) {
          setTasks(taskArray);
          console.log('Tasks updated with server data');
        } else {
          console.log('Server returned empty tasks but we have cached tasks, keeping cached data');
          setError("Server returned no tasks. Showing cached data.");
        }
        
        // Clear any previous errors if we got a successful response
        if (taskArray.length > 0) {
          setError(null);
        }
        
      } else if (response.status === 401) {
        setError("Session expired. Showing cached tasks. Please log in to refresh.");
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        // Ensure tasks are loaded from local storage on 401
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        }
      } else {
        console.log('API response not OK:', response.status, response.statusText);
        setError(`API returned an error: ${response.status} - ${response.statusText}. Using cached tasks.`);
        // Ensure tasks are loaded from local storage on other API errors
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        }
      }
    } catch (err) {
      console.log("Error fetching tasks:", err);
      setError("Network error. Showing cached tasks.");
      // Ensure tasks are loaded from local storage on network errors
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees with token
  const fetchEmployees = async (token) => {
    try {
      const response = await fetch(getEmployeeEndpoint(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const employeesData = await response.json();
        let employeeArray = [];
        
        // Handle different response structures
        if (Array.isArray(employeesData)) {
          employeeArray = employeesData;
        } else if (employeesData.users && Array.isArray(employeesData.users)) {
          employeeArray = employeesData.users;
        } else if (employeesData.data && Array.isArray(employeesData.data)) {
          employeeArray = employeesData.data;
        }
        
        // Ensure each employee has the required fields
        employeeArray = employeeArray.map(emp => ({
          _id: emp._id || emp.id,
          id: emp.id || emp._id,
          name: emp.name || emp.username || emp.fullName || `${emp.firstName} ${emp.lastName}`.trim(),
          username: emp.username,
          email: emp.email,
          role: emp.role // *** Add this line to capture the role from the API response ***
        }));
        
        // Only update employees if we got data from the server
        if (employeeArray.length > 0) {
          setEmployees(employeeArray);
          localStorage.setItem('employees', JSON.stringify(employeeArray));
          console.log('Employees updated:', employeeArray);
        }
      }
    } catch (err) {
      console.log("Error fetching employees:", err);
      // Keep using cached employees
    }
  };

  // Handle file input change for assigned file
  const handleAssignedFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAssignedFile(file);
      // It's better to store just the file object here, not the name,
      // as the actual URL will come from Cloudinary.
      // Keeping the file name in newTask.assignedFile for display is fine for now.
      setNewTask(prev => ({ ...prev, assignedFile: file.name })); 
    } else {
      setAssignedFile(null);
      setNewTask(prev => ({ ...prev, assignedFile: null }));
    }
  };

  // Upload file to Cloudinary
  const uploadFileToCloudinary = async (file) => {
    if (!file) return null;

    setUploadingFile(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication token not found. Please log in first.");
      setUploadingFile(false);
      return null;
    }

    const uploadUrl = `${currentApiBaseUrl}/files/upload`;
    console.log("Attempting file upload to:", uploadUrl); // Log the upload URL

    const formData = new FormData();
    formData.append('file', file); // 'file' is the field name expected by Multer

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // 'Content-Type' is not set for FormData, it's handled automatically by the browser
        },
        body: formData,
        signal: AbortSignal.timeout(60000) // Longer timeout for file uploads
      });

      if (response.ok) {
        const data = await response.json();
        setError(null); // Clear any previous file upload errors
        console.log("File uploaded successfully:", data.url);
        return data.url; // Return the Cloudinary URL
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || response.statusText || 'Unknown error during upload';
        setError(`File upload failed: ${errorMessage}. Status: ${response.status}`);
        console.error("File upload failed with response:", errorData);
        return null;
      }
    } catch (err) {
      setError(`File upload network error: ${err.message}. Please check your connection or server.`);
      console.error("File upload caught an error:", err);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };


  // Create a new task
  const handleAddTask = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Not authenticated. Please log in to add tasks.");
        return;
      }

      setLoading(true); // Start general loading for task creation

      let fileUrl = null;
      if (assignedFile) {
        fileUrl = await uploadFileToCloudinary(assignedFile);
        if (!fileUrl) {
          setError("Failed to upload assigned file. Task not created."); // Specific error message
          setLoading(false); // Ensure loading is off
          return; // Stop function execution if file upload fails
        }
      }

      const taskDataToSend = {
        ...newTask,
        assignedFile: fileUrl, // Use the URL obtained from Cloudinary
      };

      const response = await fetch(getTaskEndpoint(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskDataToSend), // Send task data with file URL
        signal: AbortSignal.timeout(10000)
      });
      
      if (response && response.ok) {
        const data = await response.json();
        setTasks([...tasks, data]);
        setError(null); // Clear any previous errors
        console.log("Task created successfully:", data);
      } else {
        const errorData = await response.json();
        setError(`Failed to create task: ${errorData.message || response.statusText}. Status: ${response.status}`);
        console.error("Task creation failed with response:", errorData);
      }
      
      setIsAddOpen(false);
      setNewTask({
        title: "",
        description: "",
        deadline: "",
        priority: "medium",
        assignedTo: "",
        status: "pending",
        assignedFile: null,
      });
      setAssignedFile(null); // Clear file input state
    } catch (err) {
      setError(`Failed to create task: ${err.message}. Please check server logs for details.`);
      console.error("Error during task creation (caught by handleAddTask):", err);
    } finally {
      setLoading(false); // Ensure loading is always turned off
    }
  };

  // Update existing task
  const handleEditTask = async () => {
    try {
      const token = localStorage.getItem("token");
      const taskId = taskToEdit.id || taskToEdit._id;
      
      if (!token) {
        // If not authenticated, update local tasks
        setTasks(tasks.map(task => 
          (task.id === taskId || task._id === taskId) ? taskToEdit : task
        ));
        setIsEditOpen(false);
        setTaskToEdit(null);
        return;
      }
      
      let updateEndpoint;
      const taskEndpoint = getTaskEndpoint();
      
      if (taskEndpoint.endsWith('s')) {
        updateEndpoint = `${taskEndpoint}/${taskId}`;
      } else {
        updateEndpoint = `${taskEndpoint}/${taskId}`;
      }
      
      // Update locally first to ensure we don't lose changes even if API fails
      setTasks(tasks.map(task => 
        (task.id === taskId || task._id === taskId) ? taskToEdit : task
      ));
      
      const response = await fetch(updateEndpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskToEdit),
        signal: AbortSignal.timeout(10000)
      }).catch(err => {
        // Allow the local update to proceed even if API fails
        console.log("API update failed, but task was updated locally:", err);
        return null;
      });
      
      if (response && response.ok) {
        // Update with server response data if available
        const data = await response.json();
        setTasks(tasks.map(task => 
          (task.id === taskId || task._id === taskId) ? data : task
        ));
      }
      
      setIsEditOpen(false);
      setTaskToEdit(null);
    } catch (err) {
      setError(`Failed to update task on server: ${err.message}. Changes were saved locally.`);
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole"); // Make sure you store this on login
      
      if (token) {
        try {
          const taskEndpoint = getTaskEndpoint();
          // Use admin endpoint for admins, regular endpoint for others
          const deleteUrl = userRole === 'Administrator' 
            ? `${taskEndpoint}/admin/${taskToDelete}`
            : `${taskEndpoint}/${taskToDelete}`;
          
          console.log("DELETE URL:", deleteUrl);
          
          const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.status === 204) {
            // Only delete locally after successful server deletion
            setTasks(tasks.filter(task => 
              task.id !== taskToDelete && task._id !== taskToDelete
            ));
            
            console.log("Task successfully deleted on server and locally");
          } else {
            // If server deletion fails, log error and don't delete locally
            const errorData = await response.json();
            console.error("Server deletion failed:", errorData);
            setError(`Failed to delete task on server: ${errorData.message || response.statusText}`);
            setIsDeleteOpen(false);
            setTaskToDelete(null);
            return;
          }
          
        } catch (apiErr) {
          console.error("DELETE API error:", apiErr.message);
          setError(`Failed to delete task: ${apiErr.message}. Task was not deleted from server.`);
          setIsDeleteOpen(false);
          setTaskToDelete(null);
          return; // Don't delete locally if server deletion failed
        }
      } else {
        // If not authenticated, delete locally
        setTasks(tasks.filter(task => 
          task.id !== taskToDelete && task._id !== taskToDelete
        ));
        console.log("Task successfully deleted locally (not authenticated)");
      }
      
      setIsDeleteOpen(false);
      setTaskToDelete(null);
      
    } catch (err) {
      console.error("Delete operation error:", err);
      setError(`Task deletion error: ${err.message}`);
      setIsDeleteOpen(false);
      setTaskToDelete(null);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Find employee name by ID
  const getEmployeeName = (assignedTo) => {
    console.log('getEmployeeName called with:', assignedTo);
    console.log('Type of assignedTo:', typeof assignedTo);
    console.log('Available employees:', employees);
    
    if (!assignedTo) {
      console.log('No assignedTo value, returning Unassigned');
      return "Unassigned";
    }
    
    // If assignedTo is already populated (object with name property)
    if (typeof assignedTo === 'object' && assignedTo !== null && assignedTo.name) {
      console.log('assignedTo is populated object, returning:', assignedTo.name);
      return assignedTo.name;
    }
    
    // If assignedTo is just an ID (string), look it up in employees array
    if (typeof assignedTo === 'string') {
      console.log('assignedTo is string ID, searching in employees...');
      const employee = employees.find(emp => {
        const match = (emp._id === assignedTo || emp.id === assignedTo);
        console.log(`Checking employee ${emp.name} (${emp._id || emp.id}) against ${assignedTo}: ${match}`);
        return match;
      });
      
      if (employee) {
        console.log('Found employee:', employee.name);
        return employee.name;
      } else {
        console.log('No employee found for ID:', assignedTo);
        return `Unknown Employee (${assignedTo})`;
      }
    }
    
    console.log('Fallback: returning Unassigned');
    return "Unassigned";
  };

  // Filtered employees for dropdowns (excluding 'Administrator' role)
  const assignableEmployees = employees.filter(employee => employee.role !== 'Administrator');

  if (loading && tasks.length === 0) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 text-center">Loading tasks...</p>
      </div>
    </div>
  );
  
  if (error && tasks.length === 0) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Connection Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:scale-105"
            onClick={checkAuthentication}
          >
            Try Again
          </button>
          <button 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:scale-105"
            onClick={checkEndpoints}
          >
            Find API Endpoints
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Task Management
            </h1>
            {lastUpdated && (
              <p className="text-sm text-slate-500 flex items-center mt-2">
                <FaClock className="mr-2" />
                Last updated: {new Date(lastUpdated).toLocaleString()}
                {!isAuthenticated && (
                  <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                    cached
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {isAuthenticated && (
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center"
                onClick={() => {
                  const token = localStorage.getItem('token');
                  if (token) {
                    fetchTasks(token);
                  }
                }}
              >
                <FaSync className="mr-2" /> Refresh
              </button>
            )}
            <button
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center"
              onClick={() => setIsAddOpen(true)}
            >
              <FaPlus className="mr-2" /> Add Task
            </button>
          </div>
        </div>
        
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400 rounded-xl p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-amber-700 font-medium">{error}</p>
                {!isAuthenticated && (
                  <button 
                    className="mt-2 text-blue-600 hover:text-blue-800 font-medium underline"
                    onClick={() => window.location.href = '/login'}
                  >
                    Login to sync with server
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tasks Grid */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {tasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No tasks found</h3>
              <p className="text-slate-500">Create your first task to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-100 to-blue-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Assignee</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Files</th> {/* New column */}
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tasks.map((task, index) => (
                    <tr key={task.id || task._id} className={`hover:bg-slate-50/50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white/50' : 'bg-slate-50/30'}`}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-slate-900">{task.title}</div>
                          <div className="text-sm text-slate-600 mt-1">{task.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FaUser className="mr-2 text-slate-400" />
                          <span className="text-slate-700">{getEmployeeName(task.assignedTo)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FaClock className="mr-2" />
                          <span className="text-slate-700">{formatDate(task.deadline)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          task.priority === "high" 
                            ? "bg-red-100 text-red-800 border border-red-200" 
                            : task.priority === "medium" 
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200" 
                            : "bg-green-100 text-green-800 border border-green-200"
                        }`}>
                          <FaFlag className="mr-1" />
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          task.status === "pending" 
                            ? "bg-gray-100 text-gray-800 border border-gray-200" 
                            : task.status === "in-progress" 
                            ? "bg-blue-100 text-blue-800 border border-blue-200" 
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          {task.status === "completed" && <FaCheck className="mr-1" />}
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
                        </span>
                      </td>
                      {/* New Files column */}
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {task.assignedFile && (
                          <div className="flex items-center mb-1">
                            <FaPaperclip className="mr-2 text-blue-500" />
                            <a 
                              href={task.assignedFile} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:underline"
                            >
                              Assigned File
                            </a>
                          </div>
                        )}
                        {task.completedFile && (
                          <div className="flex items-center">
                            <FaCheck className="mr-2 text-emerald-500" />
                            <a 
                              href={task.completedFile} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-emerald-600 hover:underline"
                            >
                              Completed File
                            </a>
                          </div>
                        )}
                        {!task.assignedFile && !task.completedFile && (
                          <span>No Files</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button 
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            onClick={() => {
                              setTaskToEdit(task);
                              setIsEditOpen(true);
                            }}
                          >
                            <FaEdit size={16} />
                          </button>
                          <button
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                            onClick={() => {
                              setTaskToDelete(task.id || task._id);
                              setIsDeleteOpen(true);
                            }}
                          >
                            <FaTrash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Task Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">Add New Task</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Task Title</label>
                  <input
                    type="text"
                    placeholder="Enter task title"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    placeholder="Enter task description"
                    rows={3}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assign To</label>
                  <select
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  >
                    <option value="">Select Employee</option>
                    {/* Use assignableEmployees here */}
                    {assignableEmployees.map(employee => (
                      <option key={employee._id || employee.id} value={employee._id || employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* File Input for Assigned File */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assigned File (Optional)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      id="assignedFileInput"
                      className="hidden" // Hide default file input
                      onChange={handleAssignedFileChange}
                    />
                    <label 
                      htmlFor="assignedFileInput" 
                      className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center hover:bg-blue-600 transition-colors duration-200"
                    >
                      <FaUpload className="mr-2" /> Choose File
                    </label>
                    {assignedFile && (
                      <div className="flex items-center text-slate-700">
                        <span>{assignedFile.name}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            setAssignedFile(null);
                            setNewTask(prev => ({ ...prev, assignedFile: null }));
                            document.getElementById('assignedFileInput').value = ''; // Clear file input value
                          }}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <FaTimesCircle />
                        </button>
                      </div>
                    )}
                    {uploadingFile && (
                      <span className="text-blue-500 text-sm">Uploading...</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Max 5MB. Allowed: images, PDFs, Word, Excel, PowerPoint, text files.</p>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 rounded-b-2xl flex gap-3">
                <button
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200"
                  onClick={() => {
                    setIsAddOpen(false);
                    setAssignedFile(null); // Clear file input on modal close
                    setNewTask({
                      title: "",
                      description: "",
                      deadline: "",
                      priority: "medium",
                      assignedTo: "",
                      status: "pending",
                      assignedFile: null,
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAddTask}
                  disabled={uploadingFile} // Disable button while uploading
                >
                  {uploadingFile ? 'Adding & Uploading...' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {isEditOpen && taskToEdit && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">Edit Task</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Task Title</label>
                  <input
                    type="text"
                    placeholder="Enter task title"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={taskToEdit.title}
                    onChange={(e) => setTaskToEdit({ ...taskToEdit, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    placeholder="Enter task description"
                    rows={3}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    value={taskToEdit.description}
                    onChange={(e) => setTaskToEdit({ ...taskToEdit, description: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={taskToEdit.deadline ? taskToEdit.deadline.split('T')[0] : ""}
                    onChange={(e) => setTaskToEdit({ ...taskToEdit, deadline: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    value={taskToEdit.priority}
                    onChange={(e) => setTaskToEdit({ ...taskToEdit, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assign To</label>
                  <select
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    value={typeof taskToEdit.assignedTo === 'object' ? taskToEdit.assignedTo._id : taskToEdit.assignedTo}
                    onChange={(e) => setTaskToEdit({ ...taskToEdit, assignedTo: e.target.value })}
                  >
                    <option value="">Select Employee</option>
                    {/* Use assignableEmployees here */}
                    {assignableEmployees.map(employee => (
                      <option key={employee._id || employee.id} value={employee._id || employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    value={taskToEdit.status}
                    onChange={(e) => setTaskToEdit({ ...taskToEdit, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                {/* Display current Assigned File */}
                {taskToEdit.assignedFile && (
                  <div className="flex items-center mt-2">
                    <FaPaperclip className="mr-2 text-blue-500" />
                    <span className="text-sm text-slate-700 mr-2">Current Assigned File:</span>
                    <a 
                      href={taskToEdit.assignedFile} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View File
                    </a>
                  </div>
                )}
                {/* Display current Completed File */}
                {taskToEdit.completedFile && (
                  <div className="flex items-center mt-2">
                    <FaCheck className="mr-2 text-emerald-500" />
                    <span className="text-sm text-slate-700 mr-2">Current Completed File:</span>
                    <a 
                      href={taskToEdit.completedFile} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-emerald-600 hover:underline text-sm"
                    >
                      View File
                    </a>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-50 rounded-b-2xl flex gap-3">
                <button
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg"
                  onClick={handleEditTask}
                >
                  Update Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaTrash className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Task</h2>
                <p className="text-slate-600 mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
                
                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200"
                    onClick={() => setIsDeleteOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg"
                    onClick={handleDeleteTask}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskManagement;
