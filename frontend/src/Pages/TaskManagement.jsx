import React, { useState, useEffect, useRef } from "react"; // Imported useRef for click outside detection
// Removed react-icons/fa import as it was causing a compilation error.
// Replacing with inline SVGs for the necessary icons.
import axios from "axios"; // Using axios for consistency and better error handling

const TaskManagement = () => {
  // Initialize state from localStorage if available
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('tasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditFromModal, setIsEditFromModal] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [employees, setEmployees] = useState(() => {
    const savedEmployees = localStorage.getItem('employees');
    return savedEmployees ? JSON.parse(savedEmployees) : [];
  });
  const [departments, setDepartments] = useState([]); // New state for departments
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
    assignedTo: "", // Can be employee ID or department ID
    status: "pending", // Default status to pending
    assignedFile: null,
  });

  const [assignedFile, setAssignedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false); // New state to control dropdown visibility

  const [assignToType, setAssignToType] = useState('employee'); // 'employee' or 'department'
  const [selectedDepartmentForTask, setSelectedDepartmentForTask] = useState(''); // Stores selected department ID for task assignment

  const assignToRef = useRef(null); // Ref for click outside logic

  // Effect to handle clicks outside the employee/department dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assignToRef.current && !assignToRef.current.contains(event.target)) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [assignToRef]);


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
        fetchEmployees(token); // Also refresh employees
        fetchDepartments(token); // Also refresh departments
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, employees.length, departments.length]); // Add departments.length to dependencies

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem("token");
      if (token) {
        fetchData(token);
      }
    } else {
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
      setLoading(false);
    }
  }, [isAuthenticated]);


  const initializeData = async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      setIsAuthenticated(false);
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
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
    
    try {
      await fetchData(token);
    } catch (err) {
      console.log("Failed to fetch fresh data:", err);
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
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

        const departmentEndpoints = [ // New endpoints for departments
          `${baseUrl}/departments`,
          `${baseUrl}/department`, // Keep this for backward compatibility if it returns all
          `${baseUrl}/api/departments`,
          `${baseUrl}/api/department` // Keep this for backward compatibility if it returns all
        ];
        
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

          let departmentsData = null;
          let workingDepartmentEndpoint = null;

          for (const endpoint of departmentEndpoints) {
            try {
              console.log(`Trying department endpoint: ${endpoint}`);
              const response = await fetch(endpoint, {
                headers: { 
                  Authorization: `Bearer ${token}`,
                  'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000)
              });
              
              if (response.ok) {
                const rawData = await response.json();
                console.log(`Raw department data from ${endpoint}:`, rawData);
                
                // Prioritize 'data' or 'departments' array, then fallback to direct array
                if (rawData.data && Array.isArray(rawData.data)) {
                  departmentsData = rawData.data;
                } else if (rawData.departments && Array.isArray(rawData.departments)) {
                  departmentsData = rawData.departments;
                } else if (Array.isArray(rawData)) {
                  departmentsData = rawData;
                }
                
                if (departmentsData && departmentsData.length > 0) {
                  workingDepartmentEndpoint = endpoint;
                  console.log(`Found working department endpoint: ${endpoint}`, departmentsData);
                  break;
                }
              }
            } catch (err) {
              console.log(`Endpoint ${endpoint} failed:`, err.message);
            }
          }
          
          if (workingTaskEndpoint) {
            localStorage.setItem("taskEndpoint", workingTaskEndpoint);
            if (tasksData) {
              const taskArray = Array.isArray(tasksData) ? tasksData : [];
              setTasks(taskArray);
            }
          }
          
          if (workingEmployeeEndpoint && employeesData) {
            localStorage.setItem("employeeEndpoint", workingEmployeeEndpoint);
            
            const processedEmployees = employeesData.map(emp => ({
              _id: emp._id || emp.id,
              id: emp.id || emp._id,
              name: emp.name || emp.username || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
              username: emp.username,
              email: emp.email,
              role: emp.role,
              department: emp.department // Keep department ID or object
            }));
            
            setEmployees(processedEmployees);
            localStorage.setItem('employees', JSON.stringify(processedEmployees));
            console.log('Processed employees:', processedEmployees);
          }

          if (workingDepartmentEndpoint && departmentsData) {
            localStorage.setItem("departmentEndpoint", workingDepartmentEndpoint);
            const processedDepartments = departmentsData.map(dept => ({
              _id: dept._id || dept.id,
              id: dept.id || dept._id,
              name: dept.name,
              code: dept.code,
            }));
            setDepartments(processedDepartments);
            localStorage.setItem('departments', JSON.stringify(processedDepartments));
            console.log('Processed departments:', processedDepartments);
          }
          
          setError(null);
          setLoading(false);
          return;
        }
      }
      
      setError("Could not find any working API endpoints. Using cached data.");
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch (err) {
      setError(`API endpoint check failed: ${err.message}. Using cached data.`);
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } finally {
      setLoading(false);
    }
  };

  const checkAuthentication = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication token not found. Showing cached tasks.");
      setIsAuthenticated(false);
      setLoading(false);
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

  const fetchData = (token) => {
    fetchTasks(token);
    fetchEmployees(token);
    fetchDepartments(token); // Fetch departments here
  };

  const getTaskEndpoint = () => {
    const storedEndpoint = localStorage.getItem("taskEndpoint");
    return storedEndpoint || `${currentApiBaseUrl}/tasks`;
  };

  const getEmployeeEndpoint = () => {
    const storedEndpoint = localStorage.getItem("employeeEndpoint");
    return storedEndpoint || `${currentApiBaseUrl}/users`;
  };

  const getDepartmentEndpoint = () => { // New function for department endpoint
    const storedEndpoint = localStorage.getItem("departmentEndpoint");
    // Prioritize /departments over /department for fetching all
    return storedEndpoint || `${currentApiBaseUrl}/departments`;
  };

  const fetchTasks = async (token) => {
    try {
      setLoading(true);
      
      const response = await axios.get(getTaskEndpoint(), { // Using axios
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.status >= 200 && response.status < 300) { // Check for 2xx status
        const tasksData = response.data;
        console.log('Raw tasks response:', tasksData);
        
        let taskArray = [];
        
        if (Array.isArray(tasksData)) {
          taskArray = tasksData;
        } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
          taskArray = tasksData.tasks;
        } else if (tasksData.data && Array.isArray(tasksData.data)) {
          taskArray = tasksData.data;
        }
        
        console.log('Processed task array:', taskArray);
        console.log('Current tasks count:', tasks.length);
        
        if (taskArray.length > 0 || tasks.length === 0) {
          setTasks(taskArray);
          console.log('Tasks updated with server data');
        } else {
          console.log('Server returned empty tasks but we have cached tasks, keeping cached data');
          setError("Server returned no tasks. Showing cached data.");
        }
        
        if (taskArray.length > 0) {
          setError(null);
        }
        
      } else if (response.status === 401) {
        setError("Session expired. Showing cached tasks. Please log in to refresh.");
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        }
      } else {
        console.log('API response not OK:', response.status, response.statusText);
        setError(`API returned an error: ${response.status} - ${response.statusText}. Using cached tasks.`);
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        }
      }
    } catch (err) {
      console.log("Error fetching tasks:", err);
      setError("Network error. Showing cached tasks.");
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async (token) => {
    try {
      const response = await axios.get(getEmployeeEndpoint(), { // Using axios
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.status >= 200 && response.status < 300) { // Check for 2xx status
        const employeesData = response.data;
        let employeeArray = [];
        
        if (Array.isArray(employeesData)) {
          employeeArray = employeesData;
        } else if (employeesData.users && Array.isArray(employeesData.users)) {
          employeeArray = employeesData.users;
        } else if (employeesData.data && Array.isArray(employeesData.data)) {
          employeeArray = employeesData.data;
        }
        
        employeeArray = employeeArray.map(emp => ({
          _id: emp._id || emp.id,
          id: emp.id || emp._id,
          name: emp.name || emp.username || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          username: emp.username,
          email: emp.email,
          role: emp.role,
          department: emp.department // Ensure department ID is kept
        }));
        
        if (employeeArray.length > 0) {
          setEmployees(employeeArray);
          localStorage.setItem('employees', JSON.stringify(employeeArray));
          console.log('Employees updated:', employeeArray);
        }
      }
    } catch (err) {
      console.log("Error fetching employees:", err);
    }
  };

  // New function to fetch departments
  const fetchDepartments = async (token) => {
    try {
      const currentToken = token || localStorage.getItem("token");
      if (!currentToken) {
        console.warn("No token found for fetching departments.");
        return;
      }

      const departmentEndpoints = [
        `${currentApiBaseUrl}/departments`,
        `${currentApiBaseUrl}/department`,
        `${currentApiBaseUrl}/api/departments`,
        `${currentApiBaseUrl}/api/department`
      ];

      let departmentsData = null;
      let workingEndpoint = null;

      for (const endpoint of departmentEndpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${currentToken}` },
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
        const processedDepartments = departmentsData.map(dept => ({
          _id: dept._id || dept.id,
          id: dept.id || dept._id,
          name: dept.name,
          code: dept.code,
        }));
        setDepartments(processedDepartments);
        localStorage.setItem('departments', JSON.stringify(processedDepartments));
        localStorage.setItem('departmentEndpoint', workingEndpoint); // Store the working endpoint
        console.log('Departments updated:', processedDepartments);
      } else {
        console.warn("No departments found from any known endpoint or data format was unexpected.");
        setDepartments([]); // Clear departments if none found or error
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
      // No specific error message for the user, as this is a background fetch
    }
  };

  const handleAssignedFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAssignedFile(file);
      setNewTask(prev => ({ ...prev, assignedFile: file.name })); 
    } else {
      setAssignedFile(null);
      setNewTask(prev => ({ ...prev, assignedFile: null }));
    }
  };

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

    try {
      const formData = new FormData();
      formData.append('file', file); // Append the file directly

      const response = await axios.post(uploadUrl, formData, { // Using axios
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' // Important for FormData
        },
        timeout: 60000
      });

      if (response.status >= 200 && response.status < 300) { // Check for 2xx status
        setError(null);
        return response.data.url;
      } else {
        const errorMessage = response.data?.message || response.statusText || 'Unknown error during upload';
        setError(`File upload failed: ${errorMessage}. Status: ${response.status}`);
        return null;
      }
    } catch (err) {
      setError(`File upload network error: ${err.message}. Please check your connection or server.`);
      return null;
    } finally {
      setUploadingFile(false);
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

  const handleAddTask = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Not authenticated. Please log in to add tasks.");
        return;
      }

      // Date validation for adding a task
      if (newTask.deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date to midnight
        const selectedDate = new Date(newTask.deadline);
        selectedDate.setHours(0, 0, 0, 0); // Normalize selected date to midnight

        if (selectedDate < today) {
          setError("Cannot assign a task with a past deadline.");
          setLoading(false);
          return;
        }
      }

      setLoading(true);

      let fileUrl = null;
      if (assignedFile) {
        fileUrl = await uploadFileToCloudinary(assignedFile);
        if (!fileUrl) {
          setError("Failed to upload assigned file. Task not created.");
          setLoading(false);
          return;
        }
      }

      let tasksToCreate = [];

      if (assignToType === 'employee') {
        if (!newTask.assignedTo) {
          setError("Please select an employee to assign the task to.");
          setLoading(false);
          return;
        }
        tasksToCreate.push({
          ...newTask,
          assignedTo: newTask.assignedTo, // Single employee ID
          assignedFile: fileUrl,
          status: "pending", // Force status to pending when adding
          createdAt: new Date().toISOString(), // Add creation timestamp
        });
      } else if (assignToType === 'department') {
        if (!selectedDepartmentForTask) {
          setError("Please select a department to assign the task to.");
          setLoading(false);
          return;
        }
        const employeesInDepartment = employees.filter(emp => 
          (emp.department && emp.department._id === selectedDepartmentForTask) || // If department is an object
          (typeof emp.department === 'string' && emp.department === selectedDepartmentForTask) // If department is just an ID
        );

        if (employeesInDepartment.length === 0) {
          setError("No employees found in the selected department to assign the task to.");
          setLoading(false);
          return;
        }

        employeesInDepartment.forEach(emp => {
          tasksToCreate.push({
            ...newTask,
            assignedTo: emp._id || emp.id, // Assign to each employee's ID
            assignedFile: fileUrl,
            status: "pending", // Force status to pending when adding
            createdAt: new Date().toISOString(), // Add creation timestamp
            // Optionally, add a department identifier to the task if your backend supports it
            // departmentAssigned: selectedDepartmentForTask, 
          });
        });
      }

      const createdTasks = [];
      let allTasksSuccess = true;

      for (const taskData of tasksToCreate) {
        try {
          const response = await axios.post(getTaskEndpoint(), taskData, { // Using axios
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          
          if (response.status >= 200 && response.status < 300) {
            createdTasks.push(response.data);
          } else {
            console.error(`Failed to create task for one employee: ${response.data?.message || response.statusText}`);
            allTasksSuccess = false;
          }
        } catch (err) {
          console.error(`Error creating task for one employee: ${err.message}`);
          allTasksSuccess = false;
        }
      }

      if (createdTasks.length > 0) {
        setTasks(prevTasks => [...prevTasks, ...createdTasks]);
        setError(null);
        if (!allTasksSuccess) {
          setError("Some tasks were created, but there were errors with others. Check console for details.");
        }
      } else if (!allTasksSuccess) {
        setError("Failed to create any tasks. Please check the form and server logs.");
      }
      
      setIsAddOpen(false);
      setNewTask({
        title: "",
        description: "",
        deadline: "",
        priority: "medium",
        assignedTo: "",
        status: "pending", // Reset to pending
        assignedFile: null,
      });
      setAssignedFile(null);
      setEmployeeSearchQuery(""); // Clear search query on modal close
      setSelectedDepartmentForTask(""); // Clear department selection
      setAssignToType('employee'); // Reset to employee assignment
    } catch (err) {
      setError(`Failed to create task: ${err.message}. Please check server logs for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = async () => {
    if (!taskToEdit) return; // Changed from currentEditingEmployee as it's not defined

    // Date validation for editing a task
    if (taskToEdit.deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date to midnight
      const selectedDate = new Date(taskToEdit.deadline);
      selectedDate.setHours(0, 0, 0, 0); // Normalize selected date to midnight

      if (selectedDate < today) {
        setError("Cannot set a past deadline for the task.");
        setIsEditFromModal(false); // Close modal
        setTaskToEdit(null); // Clear task to edit
        return; // Stop the update process
      }
    }

    try {
      const token = localStorage.getItem("token");
      const taskId = taskToEdit.id || taskToEdit._id;
      
      if (!token) {
        setTasks(tasks.map(task => 
          (task.id === taskId || task._id === taskId) ? taskToEdit : task
        ));
        setIsEditFromModal(false);
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
      
      setTasks(tasks.map(task => 
        (task.id === taskId || task._id === taskId) ? taskToEdit : task
      ));
      
      const response = await axios.put(updateEndpoint, taskToEdit, { // Using axios
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }).catch(err => {
        console.log("API update failed, but task was updated locally:", err);
        return null;
      });
      
      if (response && response.status >= 200 && response.status < 300) { // Check for 2xx status
        const data = response.data;
        setTasks(tasks.map(task => 
          (task.id === taskId || task._id === taskId) ? data : task
        ));
      }
      
      setIsEditFromModal(false);
      setTaskToEdit(null);
      setEmployeeSearchQuery(""); // Clear search query on modal close
    } catch (err) {
      setError(`Failed to update task on server: ${err.message}. Changes were saved locally.`);
    }
  };

  const handleDeleteTask = async () => {
    try {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");
      
      if (token) {
        try {
          const taskEndpoint = getTaskEndpoint();
          const deleteUrl = userRole === 'Administrator' 
            ? `${taskEndpoint}/admin/${taskToDelete}`
            : `${taskEndpoint}/${taskToDelete}`;
          
          console.log("DELETE URL:", deleteUrl);
          
          const response = await axios.delete(deleteUrl, { // Using axios
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          });
          
          if (response.status === 204 || response.status === 200) { // 204 No Content, or 200 OK
            setTasks(tasks.filter(task => 
              task.id !== taskToDelete && task._id !== taskToDelete
            ));
          } else {
            const errorData = response.data;
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
          return;
        }
      } else {
        setTasks(tasks.filter(task => 
          task.id !== taskToDelete && task._id !== taskToDelete
        ));
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

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getEmployeeName = (assignedTo) => {
    if (!assignedTo) {
      return "Unassigned";
    }
    
    // First, check if it's a single employee ID
    if (typeof assignedTo === 'string') {
      const employee = employees.find(emp => (emp._id === assignedTo || emp.id === assignedTo));
      if (employee) {
        return employee.username ? `${employee.name} (${employee.username})` : employee.name;
      }
      // If it's a string but not an employee, check if it's a department ID
      const department = departments.find(dept => (dept._id === assignedTo || dept.id === assignedTo));
      if (department) {
        return `Multiple Employees (Department: ${department.name})`; // Display department name if it's a department ID
      }
    } else if (typeof assignedTo === 'object' && assignedTo !== null) {
      // If assignedTo is already an employee object
      if (assignedTo.username) return `${assignedTo.name} (${assignedTo.username})`;
      if (assignedTo.name) return assignedTo.name;
      // If it's a department object
      if (assignedTo.name && assignedTo.code) return `Multiple Employees (Department: ${assignedTo.name})`;
    }
    
    return "Unassigned";
  };

  // Filter employees for dropdown based on search query
  const assignableEmployees = employees.filter(employee => 
    employee.role !== 'Administrator' &&
    (employee.name?.toLowerCase().includes(employeeSearchQuery.toLowerCase()) || 
     employee.username?.toLowerCase().includes(employeeSearchQuery.toLowerCase()))
  );

  // Set the search query based on the current assigned employee when modal opens
  useEffect(() => {
    if (isAddOpen) {
      setEmployeeSearchQuery(""); // Clear search on Add modal open
      setNewTask(prev => ({ ...prev, assignedTo: "", status: "pending" })); // Clear assignedTo and force status to pending
      setSelectedDepartmentForTask(""); // Clear department selection
      setAssignToType('employee'); // Default to employee assignment
    }
    if (isEditFromModal && taskToEdit) {
      // When editing, we only support individual employee assignment for now.
      // If the task was department-assigned, its assignedTo will be an employee ID.
      const assignedEmployee = employees.find(emp => (emp._id === taskToEdit.assignedTo || emp.id === taskToEdit.assignedTo));
      if (assignedEmployee) {
        setEmployeeSearchQuery(assignedEmployee.username ? `${assignedEmployee.name} (${assignedEmployee.username})` : assignedEmployee.name);
        setNewTask(prev => ({ ...prev, assignedTo: assignedEmployee._id || assignedEmployee.id })); // Ensure newTask has the correct ID
      } else {
        setEmployeeSearchQuery("");
        setNewTask(prev => ({ ...prev, assignedTo: "" }));
      }
      setAssignToType('employee'); // Force employee assignment for edit modal
      setSelectedDepartmentForTask(""); // Clear department selection
    }
  }, [isAddOpen, isEditFromModal, taskToEdit, employees]);

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
                {/* FaClock Icon */}
                <svg className="mr-2" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L11 9.586V6z" clipRule="evenodd"></path></svg>
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
                {/* FaSync Icon */}
                <svg className="mr-2" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.666 5.657L18 10a1 1 0 110 2l-1.333-.001C15.438 12.012 13.78 11 12 11H9.5a1 1 0 01-.8-.4l-2.5-3.5A1 1 0 015 6h-.5A1.5 1.5 0 003 7.5v2.75a.75.75 0 01-1.5 0v-2.75a3 3 0 013-3h.5A3 3 0 018 3.5V3a1 1 0 011-1h6a1 1 0 011 1v.75A.75.75 0 0115.25 4.5h-.75V3H10a1 1 0 00-1-1H4z" clipRule="evenodd"></path></svg>
                Refresh
              </button>
            )}
            <button
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center"
              onClick={() => setIsAddOpen(true)}
            >
              {/* FaPlus Icon */}
              <svg className="mr-2" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path></svg>
              Add Task
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Files</th>
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
                          {/* FaUser Icon */}
                          <svg className="mr-2 text-slate-400" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                          <span className="text-slate-700">{getEmployeeName(task.assignedTo)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {/* FaClock Icon */}
                          <svg className="mr-2" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L11 9.586V6z" clipRule="evenodd"></path></svg>
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
                          {/* FaFlag Icon */}
                          <svg className="mr-1" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a3 3 0 01-3-3V6zm-3 0a2 2 0 012-2h14a.5.5 0 01.4.8L16.25 7l2.15 2.8a.5.5 0 01-.4.8H2a2 2 0 01-2-2V6z" clipRule="evenodd"></path></svg>
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
                          {task.status === "completed" && (
                            // FaCheck Icon
                            <svg className="mr-1" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                          )}
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
                        </span>
                      </td>
                      {/* New Files column */}
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {task.assignedFile && (
                          <div className="flex items-center mb-1">
                            {/* FaPaperclip Icon */}
                            <svg className="mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1a1 1 0 100 2h1a1 1 0 01-1.707.707l-7-7a1 1 0 010-1.414z" clipRule="evenodd"></path><path fillRule="evenodd" d="M10 12a2 2 0 10-4 0v3a2 2 0 104 0v-3z" clipRule="evenodd"></path></svg>
                            <a 
                              href={getDownloadLink(task.assignedFile)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:underline"
                            >
                              Download Assigned File
                            </a>
                          </div>
                        )}
                        {task.completedFile && (
                          <div className="flex items-center">
                            {/* FaCheck Icon */}
                            <svg className="mr-2 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                            <a 
                              href={task.completedFile} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-emerald-600 hover:underline"
                            >
                              View Completed File
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
                              setIsEditFromModal(true);
                            }}
                          >
                            {/* FaEdit Icon */}
                            <svg fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path d="M13.586 3.586a2 2 0 112.828 2.828L15.172 8.414L12 5.242l1.586-1.586zM3 17.25V14l10-10l3.25 3.25l-10 10H3z" fillRule="evenodd"></path></svg>
                          </button>
                          <button
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                            onClick={() => {
                              setTaskToDelete(task.id || task._id);
                              setIsDeleteOpen(true);
                            }}
                          >
                            {/* FaTrash Icon */}
                            <svg fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 3a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z" clipRule="evenodd"></path></svg>
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
                    min={new Date().toISOString().split('T')[0]} // Set minimum date to today
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
                
                {/* Assign To Type Selection */}
                <div className="flex items-center space-x-4 mb-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-600"
                      name="assignToType"
                      value="employee"
                      checked={assignToType === 'employee'}
                      onChange={() => {
                        setAssignToType('employee');
                        setSelectedDepartmentForTask(''); // Clear department selection
                        setNewTask(prev => ({ ...prev, assignedTo: "" })); // Clear employee selection
                        setEmployeeSearchQuery("");
                      }}
                    />
                    <span className="ml-2 text-slate-700">Assign to Employee</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-600"
                      name="assignToType"
                      value="department"
                      checked={assignToType === 'department'}
                      onChange={() => {
                        setAssignToType('department');
                        setNewTask(prev => ({ ...prev, assignedTo: "" })); // Clear employee selection
                        setEmployeeSearchQuery("");
                      }}
                    />
                    <span className="ml-2 text-slate-700">Assign to Department</span>
                  </label>
                </div>

                {/* Conditional Assign To Fields */}
                {assignToType === 'employee' && (
                  <div className="relative" ref={assignToRef}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Assign To Employee</label>
                    <input
                      type="text"
                      placeholder="Search or select employee"
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={employeeSearchQuery}
                      onChange={(e) => {
                        setEmployeeSearchQuery(e.target.value);
                        setShowEmployeeDropdown(true); // Show dropdown on type
                        setNewTask(prev => ({ ...prev, assignedTo: "" })); // Clear selection if typing
                      }}
                      onFocus={() => setShowEmployeeDropdown(true)} // Show dropdown on focus
                    />
                    {showEmployeeDropdown && (
                      <ul className="absolute z-10 w-full bg-white border border-slate-300 rounded-xl mt-1 max-h-60 overflow-y-auto shadow-lg">
                        {assignableEmployees.length > 0 ? (
                          assignableEmployees.map(employee => (
                            <li
                              key={employee._id || employee.id}
                              className="p-3 hover:bg-slate-100 cursor-pointer text-slate-800"
                              onClick={() => {
                                const displayName = employee.username ? `${employee.name} (${employee.username})` : employee.name;
                                setEmployeeSearchQuery(displayName);
                                setNewTask(prev => ({ ...prev, assignedTo: employee._id || employee.id }));
                                setShowEmployeeDropdown(false);
                              }}
                            >
                              {employee.name} {employee.username && `(${employee.username})`}
                            </li>
                          ))
                        ) : (
                          <li className="p-3 text-slate-500">No employees found.</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}

                {assignToType === 'department' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Assign To Department</label>
                    <select
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      value={selectedDepartmentForTask}
                      onChange={(e) => setSelectedDepartmentForTask(e.target.value)}
                    >
                      <option value="">Select a Department</option>
                      {departments.map(dept => (
                        <option key={dept._id || dept.id} value={dept._id || dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Status field - only 'pending' allowed when adding a new task */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                    value="pending" // Always default to "pending" for new tasks
                    onChange={() => {}} // Make it read-only for new tasks
                    disabled // Disable the select box
                  >
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {/* File Input for Assigned File */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assigned File (Optional)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      id="assignedFileInput"
                      className="hidden"
                      onChange={handleAssignedFileChange}
                    />
                    <label 
                      htmlFor="assignedFileInput" 
                      className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center hover:bg-blue-600 transition-colors duration-200"
                    >
                      {/* FaUpload Icon */}
                      <svg className="mr-2" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-3.382l-.724-1.447A1 1 0 0011 2H9a1 1 0 00-.894.553L7.382 5H4zm0 2h12v8H4V7zm5 3a1 1 0 011 1v1a1 1 0 102 0v-1a1 1 0 011-1h1a1 1 0 010 2h-1v1a1 1 0 10-2 0v-1a1 1 0 01-1-1v-1a1 1 0 011-1z" clipRule="evenodd"></path></svg>
                      Choose File
                    </label>
                    {assignedFile && (
                      <div className="flex items-center text-slate-700">
                        <span>{assignedFile.name}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            setAssignedFile(null);
                            setNewTask(prev => ({ ...prev, assignedFile: null }));
                            document.getElementById('assignedFileInput').value = '';
                          }}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          {/* FaTimesCircle Icon */}
                          <svg fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
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
                    setAssignedFile(null);
                    setNewTask({
                      title: "",
                      description: "",
                      deadline: "",
                      priority: "medium",
                      assignedTo: "",
                      status: "pending", // Reset to pending
                      assignedFile: null,
                    });
                    setEmployeeSearchQuery("");
                    setSelectedDepartmentForTask("");
                    setAssignToType('employee');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAddTask}
                  disabled={uploadingFile || (assignToType === 'employee' && !newTask.assignedTo) || (assignToType === 'department' && !selectedDepartmentForTask)}
                >
                  {uploadingFile ? 'Adding & Uploading...' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {isEditFromModal && taskToEdit && (
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
                    min={new Date().toISOString().split('T')[0]} // Set minimum date to today
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
                
                {/* Unified Assign To Search and Select for Edit Modal */}
                {/* For simplicity, edit modal only allows individual employee assignment */}
                <div className="relative" ref={assignToRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assign To Employee</label>
                  <input
                    type="text"
                    placeholder="Search or select employee"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={employeeSearchQuery}
                    onChange={(e) => {
                      setEmployeeSearchQuery(e.target.value);
                      setShowEmployeeDropdown(true);
                      setTaskToEdit(prev => ({ ...prev, assignedTo: "" })); // Clear selection if typing
                    }}
                    onFocus={() => setShowEmployeeDropdown(true)}
                  />
                  {showEmployeeDropdown && (
                    <ul className="absolute z-10 w-full bg-white border border-slate-300 rounded-xl mt-1 max-h-60 overflow-y-auto shadow-lg">
                      {assignableEmployees.length > 0 ? (
                        assignableEmployees.map(employee => (
                          <li
                            key={employee._id || employee.id}
                            className="p-3 hover:bg-slate-100 cursor-pointer text-slate-800"
                            onClick={() => {
                              const displayName = employee.username ? `${employee.name} (${employee.username})` : employee.name;
                              setEmployeeSearchQuery(displayName);
                              setTaskToEdit(prev => ({ ...prev, assignedTo: employee._id || employee.id }));
                              setShowEmployeeDropdown(false);
                            }}
                          >
                            {employee.name} {employee.username && `(${employee.username})`}
                          </li>
                        ))
                      ) : (
                        <li className="p-3 text-slate-500">No employees found.</li>
                      )}
                    </ul>
                  )}
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
                    {/* FaPaperclip Icon */}
                    <svg className="mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1a1 1 0 100 2h1a1 1 0 01-1.707.707l-7-7a1 1 0 010-1.414z" clipRule="evenodd"></path><path fillRule="evenodd" d="M10 12a2 2 0 10-4 0v3a2 2 0 104 0v-3z" clipRule="evenodd"></path></svg>
                    <span className="text-sm text-slate-700 mr-2">Current Assigned File:</span>
                    <a 
                      href={getDownloadLink(taskToEdit.assignedFile)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline"
                    >
                      Download File
                    </a>
                  </div>
                )}
                {/* Display current Completed File */}
                {taskToEdit.completedFile && (
                  <div className="flex items-center mt-2">
                    {/* FaCheck Icon */}
                    <svg className="mr-2 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                    <span className="text-sm text-slate-700 mr-2">Current Completed File:</span>
                    <a 
                      href={taskToEdit.completedFile} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-emerald-600 hover:underline"
                    >
                      View File
                    </a>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-50 rounded-b-2xl flex gap-3">
                <button
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200"
                  onClick={() => {
                    setIsEditFromModal(false);
                    setEmployeeSearchQuery("");
                  }}
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
                  {/* FaTrash Icon */}
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20" width="1em" height="1em"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 3a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z" clipRule="evenodd"></path></svg>
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
