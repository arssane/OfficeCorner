// Fixed Employee Task View Integration
// This should replace the task section in your employee dashboard

import React, { useState, useEffect } from 'react';
import { GrView } from 'react-icons/gr';
import axios from 'axios';

// Employee Task View Component
const EmployeeTaskView = ({ currentEmployee }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  // Get API endpoints
  const getTaskEndpoint = () => {
    const storedEndpoint = localStorage.getItem("taskEndpoint");
    const baseUrl = localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
    return storedEndpoint || `${baseUrl}/tasks`;
  };

  // Fetch employee tasks
  const fetchEmployeeTasks = async (employeeId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in first.");
        return;
      }

      console.log("Fetching tasks for employee:", employeeId);
      
      const taskEndpoint = getTaskEndpoint();
      
      // Try different endpoints to get user tasks
      const possibleEndpoints = [
        `${taskEndpoint}/user/${employeeId}`,
        `${taskEndpoint}/employee/${employeeId}`,
        `${taskEndpoint}?assignedTo=${employeeId}`,
        `${taskEndpoint}` // Get all and filter locally
      ];

      let tasksData = [];
      let fetchSuccess = false;

      for (const endpoint of possibleEndpoints) {
        try {
          console.log("Trying endpoint:", endpoint);
          
          const response = await axios.get(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          });

          if (response.status === 200) {
            const data = Array.isArray(response.data) ? response.data : [];
            
            // If we got all tasks, filter for this employee
            if (endpoint.includes('?assignedTo=') || endpoint === taskEndpoint) {
              tasksData = data.filter(task => 
                task.assignedTo === employeeId || 
                task.assignedTo === currentEmployee?.id ||
                task.assignedTo === currentEmployee?._id
              );
            } else {
              tasksData = data;
            }
            
            console.log("Successfully fetched tasks:", tasksData.length);
            fetchSuccess = true;
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed:`, err.response?.status);
          continue;
        }
      }

      if (!fetchSuccess) {
        throw new Error("All task endpoints failed");
      }

      setTasks(tasksData);
      setError(null);

    } catch (err) {
      console.error("Error fetching employee tasks:", err);
      setError(`Failed to fetch tasks: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Authentication token not found. Please log in first.");
        return;
      }

      // Find the task to update
      const taskToUpdate = tasks.find(task => 
        (task.id && task.id === taskId) || (task._id && task._id === taskId)
      );
      
      if (!taskToUpdate) {
        console.error("Task not found with ID:", taskId);
        return;
      }

      console.log("Updating task status:", taskId, "to", newStatus);

      // Optimistically update the UI
      setTasks(prevTasks =>
        prevTasks.map(task => {
          const taskMatch = (task.id && task.id === taskId) || (task._id && task._id === taskId);
          return taskMatch 
            ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
            : task;
        })
      );

      const taskEndpoint = getTaskEndpoint();
      
      // Try different update endpoints
      const updateEndpoints = [
        `${taskEndpoint}/${taskId}`,
        `${taskEndpoint}/update/${taskId}`,
        `${taskEndpoint}/${taskId}/status`,
        `${taskEndpoint}/status/${taskId}`
      ];

      let updateSuccess = false;
      let responseData = null;

      for (const endpoint of updateEndpoints) {
        try {
          console.log("Trying update endpoint:", endpoint);
          
          // Try PATCH first (for status-only updates), then PUT
          const methods = ['patch', 'put'];
          
          for (const method of methods) {
            try {
              const payload = method === 'patch' 
                ? { status: newStatus }
                : { ...taskToUpdate, status: newStatus, updatedAt: new Date().toISOString() };

              const response = await axios[method](endpoint, payload, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                timeout: 10000
              });

              if (response.status >= 200 && response.status < 300) {
                console.log(`Task updated successfully with ${method.toUpperCase()} at:`, endpoint);
                updateSuccess = true;
                responseData = response.data;
                break;
              }
            } catch (methodErr) {
              console.log(`${method.toUpperCase()} method failed for ${endpoint}:`, methodErr.response?.status);
              continue;
            }
          }
          
          if (updateSuccess) break;
          
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed:`, err.response?.status);
          continue;
        }
      }

      if (!updateSuccess) {
        throw new Error("All update endpoints failed");
      }

      // Update with server response if available
      if (responseData) {
        setTasks(prevTasks =>
          prevTasks.map(task => {
            const taskMatch = (task.id && task.id === taskId) || (task._id && task._id === taskId);
            return taskMatch ? responseData : task;
          })
        );
      }

      alert(`Task marked as ${newStatus.replace('-', ' ')}`);

      // Refresh tasks to ensure consistency
      if (currentEmployee) {
        setTimeout(() => {
          fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
        }, 1000);
      }

    } catch (err) {
      console.error("Error updating task status:", err);
      
      // Revert the optimistic update
      const originalTask = tasks.find(task => 
        (task.id && task.id === taskId) || (task._id && task._id === taskId)
      );
      
      if (originalTask) {
        setTasks(prevTasks =>
          prevTasks.map(task => {
            const taskMatch = (task.id && task.id === taskId) || (task._id && task._id === taskId);
            return taskMatch ? originalTask : task;
          })
        );
      }

      // Show error message
      if (err.response?.status === 403) {
        alert("You don't have permission to update this task.");
      } else if (err.response?.status === 404) {
        alert("Task not found on server.");
      } else if (err.response?.status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("token");
        window.location.href = '/login';
      } else {
        alert(`Failed to update task: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Initial load
  useEffect(() => {
    if (currentEmployee && (currentEmployee.id || currentEmployee._id)) {
      fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
    }
  }, [currentEmployee]);

  // Task Modal Component
  const TaskModal = ({ task, isOpen, onClose }) => {
    if (!isOpen || !task) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Task Details</h3>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <strong className="text-gray-700">Title:</strong>
              <p className="mt-1">{task.title}</p>
            </div>
            
            <div>
              <strong className="text-gray-700">Description:</strong>
              <p className="mt-1">{task.description || 'No description'}</p>
            </div>
            
            <div>
              <strong className="text-gray-700">Due Date:</strong>
              <p className="mt-1">{formatDate(task.deadline)}</p>
            </div>
            
            <div>
              <strong className="text-gray-700">Priority:</strong>
              <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full 
                ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-green-100 text-green-800'}`}
              >
                {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
              </span>
            </div>
            
            <div>
              <strong className="text-gray-700">Status:</strong>
              <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full 
                ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                  task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                  'bg-gray-100 text-gray-800'}`}
              >
                {task.status === 'in-progress' ? 'In Progress' : 
                  task.status?.charAt(0).toUpperCase() + task.status?.slice(1)}
              </span>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">My Tasks</h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  if (currentEmployee) {
                    fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
                  }
                }}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-md hover:bg-green-200"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading your tasks...</div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">{error}</div>
              <button 
                onClick={() => {
                  if (currentEmployee) {
                    fetchEmployeeTasks(currentEmployee.id || currentEmployee._id);
                  }
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
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
                      <tr key={task.id || task._id} className="hover:bg-gray-50">
                        <td className="py-4 px-4 text-sm text-gray-900">{task.title}</td>
                        <td className="py-4 px-4 text-sm text-gray-500">
                          {task.description?.length > 50 
                            ? `${task.description.substring(0, 50)}...` 
                            : task.description}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500">{formatDate(task.deadline)}</td>
                        <td className="py-4 px-4 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                            ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'}`}
                          >
                            {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                            ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'}`}
                          >
                            {task.status === 'in-progress' ? 'In Progress' : 
                              task.status?.charAt(0).toUpperCase() + task.status?.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <div className="flex space-x-2">
                            <button 
                              className="text-green-600 hover:text-green-800 p-1" 
                              onClick={() => {
                                setSelectedTask(task);
                                setIsModalOpen(true);
                              }}
                              title="View Details"
                            >
                              <GrView />
                            </button>
                            
                            {task.status === 'pending' && (
                              <button 
                                className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-600 rounded hover:bg-blue-50"
                                onClick={() => updateTaskStatus(task.id || task._id, 'in-progress')}
                                title="Start Task"
                              >
                                Start
                              </button>
                            )}
                            
                            {task.status !== 'completed' && (
                              <button 
                                className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-600 rounded hover:bg-green-50"
                                onClick={() => updateTaskStatus(task.id || task._id, 'completed')}
                                title="Mark as Complete"
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
      
      <TaskModal 
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </>
  );
};

export default EmployeeTaskView;