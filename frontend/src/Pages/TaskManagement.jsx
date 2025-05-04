import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaSync } from "react-icons/fa";
import { Dialog } from "@headlessui/react";
import axios from "axios";

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
  });

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

  // Check authentication on mount
  useEffect(() => {
    // Set loading to false if we have cached tasks
    if (tasks.length > 0) {
      setLoading(false);
    }
    
    checkAuthentication();
  }, []);

  // Check API endpoint and try options
  const checkEndpoints = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in first.");
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
          `${baseUrl}/employees`,
          `${baseUrl}/employee`,
          `${baseUrl}/api/employees`,
          `${baseUrl}/api/employee`
        ];
        
        // Try task endpoints with this base URL
        let tasksData = null;
        let workingTaskEndpoint = null;
        
        for (const endpoint of taskEndpoints) {
          try {
            console.log(`Trying task endpoint: ${endpoint}`);
            const response = await axios.get(endpoint, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
              },
              timeout: 5000
            });
            
            if (response.status === 200) {
              tasksData = response.data;
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
              const response = await axios.get(endpoint, {
                headers: { 
                  Authorization: `Bearer ${token}`,
                  'Accept': 'application/json'
                },
                timeout: 5000
              });
              
              if (response.status === 200) {
                employeesData = response.data;
                workingEmployeeEndpoint = endpoint;
                console.log(`Found working employee endpoint: ${endpoint}`);
                break;
              }
            } catch (err) {
              console.log(`Endpoint ${endpoint} failed:`, err.message);
            }
          }
          
          if (workingTaskEndpoint) {
            localStorage.setItem("taskEndpoint", workingTaskEndpoint);
            if (tasksData && tasksData.length > 0) {
              setTasks(tasksData);
            }
          }
          
          if (workingEmployeeEndpoint) {
            localStorage.setItem("employeeEndpoint", workingEmployeeEndpoint);
            if (employeesData && employeesData.length > 0) {
              setEmployees(employeesData);
              localStorage.setItem('employees', JSON.stringify(employeesData));
            }
          }
          
          setError(null);
          setLoading(false);
          return;
        }
      }
      
      setError("Could not find any working API endpoints. Using cached data.");
    } catch (err) {
      setError(`API endpoint check failed: ${err.message}. Using cached data.`);
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
    return storedEndpoint || `${currentApiBaseUrl}/employee`;
  };

  // Fetch tasks with token
  const fetchTasks = async (token) => {
    try {
      setLoading(true);
      
      const response = await axios.get(getTaskEndpoint(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        validateStatus: function (status) {
          return status < 500;
        },
        timeout: 10000
      });
      
      if (response.status >= 200 && response.status < 300) {
        const tasksData = Array.isArray(response.data) ? response.data : [];
        
        // Only update tasks if we got data from the server
        if (tasksData.length > 0) {
          setTasks(tasksData);
        }
        
        setError(null);
      } else if (response.status === 401) {
        setError("Session expired. Showing cached tasks. Please log in to refresh.");
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      } else {
        setError(`API returned an error: ${response.status} - ${response.statusText}. Using cached tasks.`);
      }
    } catch (err) {
      console.log("Error fetching tasks:", err);
      setError("Network error. Showing cached tasks.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees with token
  const fetchEmployees = async (token) => {
    try {
      const response = await axios.get(getEmployeeEndpoint(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        validateStatus: function (status) {
          return status < 500;
        },
        timeout: 10000
      });
      
      if (response.status >= 200 && response.status < 300) {
        const employeesData = Array.isArray(response.data) ? response.data : [];
        
        // Only update employees if we got data from the server
        if (employeesData.length > 0) {
          setEmployees(employeesData);
          localStorage.setItem('employees', JSON.stringify(employeesData));
        }
      }
    } catch (err) {
      console.log("Error fetching employees:", err);
      // Keep using cached employees
    }
  };

  // Create a new task
  const handleAddTask = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        // If not authenticated, just add to local tasks
        const newTaskWithId = {
          ...newTask,
          id: Date.now().toString() // Generate a temporary ID
        };
        setTasks([...tasks, newTaskWithId]);
        setIsAddOpen(false);
        setNewTask({
          title: "",
          description: "",
          deadline: "",
          priority: "medium",
          assignedTo: "",
          status: "pending",
        });
        return;
      }
      
      const response = await axios.post(getTaskEndpoint(), newTask, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }).catch(err => {
        // If API fails, add task locally
        const newTaskWithId = {
          ...newTask,
          id: Date.now().toString()
        };
        setTasks([...tasks, newTaskWithId]);
        throw err;
      });
      
      if (response && response.data) {
        setTasks([...tasks, response.data]);
      }
      
      setIsAddOpen(false);
      setNewTask({
        title: "",
        description: "",
        deadline: "",
        priority: "medium",
        assignedTo: "",
        status: "pending",
      });
    } catch (err) {
      setError(`Failed to create task on server: ${err.message}. Task was saved locally.`);
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
      
      const response = await axios.put(updateEndpoint, taskToEdit, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }).catch(err => {
        // Allow the local update to proceed even if API fails
        console.log("API update failed, but task was updated locally:", err);
        return null;
      });
      
      if (response && response.data) {
        // Update with server response data if available
        setTasks(tasks.map(task => 
          (task.id === taskId || task._id === taskId) ? response.data : task
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
      
      // Store deletion in localStorage
      const deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '[]');
      deletedTasks.push(taskToDelete);
      localStorage.setItem('deletedTasks', JSON.stringify(deletedTasks));
      
      // Update the lastTaskDeletion timestamp
      const deletionTimestamp = new Date().toISOString();
      localStorage.setItem('lastTaskDeletion', deletionTimestamp);
      
      // Delete locally
      setTasks(tasks.filter(task => 
        task.id !== taskToDelete && task._id !== taskToDelete
      ));
      
      // Try server-side deletion if authenticated
      if (token) {
        try {
          const taskEndpoint = getTaskEndpoint();
          console.log("Using delete endpoint:", `${taskEndpoint}/${taskToDelete}`);
          
          await axios.delete(`${taskEndpoint}/${taskToDelete}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          });
          
          console.log("Task successfully deleted on server");
        } catch (apiErr) {
          console.log("DELETE API error:", apiErr);
          console.log("Task was removed locally but server deletion failed");
        }
      }
      
      // Always close the dialog and clean up state
      setIsDeleteOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      console.log("Delete operation error:", err);
      setError(`Task deletion error: ${err.message}. Task was removed locally.`);
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
  const getEmployeeName = (employeeId) => {
    if (!employeeId) return "Unassigned";
    const employee = employees.find(emp => emp._id === employeeId || emp.id === employeeId);
    return employee ? employee.name : "Unknown";
  };

  if (loading && tasks.length === 0) return <div className="text-center p-6">Loading tasks...</div>;
  
  if (error && tasks.length === 0) return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
      <p className="mb-4">{error}</p>
      <div className="flex space-x-4">
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={checkAuthentication}
        >
          Try Again
        </button>
        <button 
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={checkEndpoints}
        >
          Find Working API Endpoints
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Task Management</h2>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {new Date(lastUpdated).toLocaleString()}
              {!isAuthenticated && " (cached)"}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          {isAuthenticated && (
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
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
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            onClick={() => setIsAddOpen(true)}
          >
            + Add Task
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
          <p>{error}</p>
          {!isAuthenticated && (
            <button 
              className="mt-2 text-blue-600 hover:text-blue-800"
              onClick={() => window.location.href = '/login'}
            >
              Login to sync with server
            </button>
          )}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-3">Title</th>
              <th className="p-3">Description</th>
              <th className="p-3">Assigned To</th>
              <th className="p-3">Deadline</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-3 text-center text-gray-500">No tasks found</td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id || task._id} className="border-t">
                  <td className="p-3">{task.title}</td>
                  <td className="p-3">{task.description}</td>
                  <td className="p-3">{getEmployeeName(task.assignedTo)}</td>
                  <td className="p-3">{formatDate(task.deadline)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${task.priority === "high" ? "bg-red-100 text-red-800" : 
                        task.priority === "medium" ? "bg-yellow-100 text-yellow-800" : 
                        "bg-green-100 text-green-800"}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${task.status === "pending" ? "bg-gray-100 text-gray-800" : 
                        task.status === "in-progress" ? "bg-blue-100 text-blue-800" : 
                        "bg-green-100 text-green-800"}`}>
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
                    </span>
                  </td>
                  <td className="p-3 flex space-x-3">
                    <button 
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => {
                        setTaskToEdit(task);
                        setIsEditOpen(true);
                      }}
                    >
                      <FaEdit size={18} />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        setTaskToDelete(task.id || task._id);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <FaTrash size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Task Modal */}
      <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
          
          <input
            type="text"
            placeholder="Task Title"
            className="w-full mb-2 p-2 border rounded"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
          
          <textarea
            placeholder="Description"
            className="w-full mb-2 p-2 border rounded"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          
          <div className="mb-2">
            <label className="block text-sm text-gray-600 mb-1">Deadline</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
            />
          </div>
          
          <div className="mb-2">
            <label className="block text-sm text-gray-600 mb-1">Priority</label>
            <select
              className="w-full p-2 border rounded"
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div className="mb-2">
            <label className="block text-sm text-gray-600 mb-1">Assign To</label>
            <select
              className="w-full p-2 border rounded"
              value={newTask.assignedTo}
              onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
            >
              <option value="">Select Employee</option>
              {employees.map(employee => (
                <option key={employee._id || employee.id} value={employee._id || employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-2">
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              className="w-full p-2 border rounded"
              value={newTask.status}
              onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div className="flex justify-between mt-4">
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </button>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={handleAddTask}
            >
              Add Task
            </button>
          </div>
        </div>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        {taskToEdit && (
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-semibold mb-4">Edit Task</h2>
            
            <input
              type="text"
              placeholder="Task Title"
              className="w-full mb-2 p-2 border rounded"
              value={taskToEdit.title}
              onChange={(e) => setTaskToEdit({ ...taskToEdit, title: e.target.value })}
            />
            
            <textarea
              placeholder="Description"
              className="w-full mb-2 p-2 border rounded"
              value={taskToEdit.description}
              onChange={(e) => setTaskToEdit({ ...taskToEdit, description: e.target.value })}
            />
            
            <div className="mb-2">
              <label className="block text-sm text-gray-600 mb-1">Deadline</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={taskToEdit.deadline ? taskToEdit.deadline.split('T')[0] : ""}
                onChange={(e) => setTaskToEdit({ ...taskToEdit, deadline: e.target.value })}
              />
            </div>
            
            <div className="mb-2">
              <label className="block text-sm text-gray-600 mb-1">Priority</label>
              <select
                className="w-full p-2 border rounded"
                value={taskToEdit.priority}
                onChange={(e) => setTaskToEdit({ ...taskToEdit, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="mb-2">
              <label className="block text-sm text-gray-600 mb-1">Assign To</label>
              <select
                className="w-full p-2 border rounded"
                value={taskToEdit.assignedTo}
                onChange={(e) => setTaskToEdit({ ...taskToEdit, assignedTo: e.target.value })}
              >
                <option value="">Select Employee</option>
                {employees.map(employee => (
                  <option key={employee._id || employee.id} value={employee._id || employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-2">
              <label className="block text-sm text-gray-600 mb-1">Status</label>
              <select
                className="w-full p-2 border rounded"
                value={taskToEdit.status}
                onChange={(e) => setTaskToEdit({ ...taskToEdit, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div className="flex justify-between mt-4">
              <button
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={handleEditTask}
              >
                Update Task
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-80">
          <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
          <p>Are you sure you want to delete this task?</p>
          <div className="flex justify-end mt-4">
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={handleDeleteTask}
            >
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TaskManagement;