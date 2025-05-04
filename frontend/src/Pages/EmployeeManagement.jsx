import React, { useState, useEffect } from "react";
import axios from "axios";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:5000/api"); // Make API base URL configurable
  const [newEmployee, setNewEmployee] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });
  
  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, [apiBaseUrl]);
  
  // Fetch all employees with better error handling
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
        // Adding timeout to avoid hanging requests
        timeout: 10000
      });
      
      setEmployees(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching employees:", err);
      
      // Provide more specific error messages based on the error
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 404) {
          setError(`API endpoint not found. Please check if the server is running and the endpoint path is correct. (${apiBaseUrl}/employee)`);
        } else if (err.response.status === 401 || err.response.status === 403) {
          setError("Authentication failed. Please log in again.");
        } else {
          setError(`Server error: ${err.response.data.message || err.message}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError("No response from server. Please check if the server is running.");
      } else {
        // Something happened in setting up the request
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle Input Change
  const handleChange = (e) => {
    setNewEmployee({ ...newEmployee, [e.target.name]: e.target.value });
  };
  
  // Handle API URL change
  const handleApiUrlChange = (e) => {
    setApiBaseUrl(e.target.value);
  };
  
  // Add Employee Function
  const handleAddEmployee = async () => {
    try {
      setIsLoading(true);
      
      // Validate input
      if (Object.values(newEmployee).some((value) => value === "")) {
        setError("Please fill out all fields!");
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
      
      // Send request to add employee
      const response = await axios.post(
        `${apiBaseUrl}/employee`,
        newEmployee,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      // Update employees list with new employee
      setEmployees([...employees, response.data.employee]);
      
      // Reset form and close modal
      setNewEmployee({ username: "", name: "", email: "", password: "", phone: "", address: "" });
      setIsModalOpen(false);
      setError("");
    } catch (err) {
      console.error("Error adding employee:", err);
      
      if (err.response) {
        setError(err.response.data.message || "Failed to add employee. Server returned an error.");
      } else if (err.request) {
        setError("No response from server. Please check if the server is running.");
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteEmployee = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        setIsLoading(true);
        
        // Get token from localStorage
        const token = localStorage.getItem("token");
        
        if (!token) {
          setError("Authentication token not found. Please log in again.");
          setIsLoading(false);
          return;
        }
        
        // Send request to delete employee
        await axios.delete(`${apiBaseUrl}/employee/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 10000
        });
        
        // Update employees list by removing deleted employee
        setEmployees(employees.filter(employee => employee._id !== id));
        setError("");
      } catch (err) {
        console.error("Error deleting employee:", err);
        
        if (err.response) {
          setError(err.response.data.message || "Failed to delete employee. Server returned an error.");
        } else if (err.request) {
          setError("No response from server. Please check if the server is running.");
        } else {
          setError(`Error: ${err.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Function to handle employee editing (additional feature)
  const handleEditEmployee = async (id, updatedData) => {
    try {
      setIsLoading(true);
      
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }
      
      // Send request to update employee
      const response = await axios.put(
        `${apiBaseUrl}/employee/${id}`,
        updatedData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      // Update employees list with updated employee data
      setEmployees(
        employees.map(employee => 
          employee._id === id ? response.data : employee
        )
      );
      
      setError("");
    } catch (err) {
      console.error("Error updating employee:", err);
      
      if (err.response) {
        setError(err.response.data.message || "Failed to update employee. Server returned an error.");
      } else if (err.request) {
        setError("No response from server. Please check if the server is running.");
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to retry connection
  const handleRetryConnection = () => {
    setError("");
    fetchEmployees();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => setIsModalOpen(true)}
        >
          Add Employee
        </button>
      </div>
      
      {/* API URL Configuration
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">API Configuration</h2>
        <div className="flex items-center">
          <label className="mr-2">API Base URL:</label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={handleApiUrlChange}
            className="border rounded px-2 py-1 flex-grow"
            placeholder="Enter API base URL"
          />
          <button
            onClick={handleRetryConnection}
            className="ml-2 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
          >
            Connect
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Example: http://localhost:5000/api or http://yourdomain.com/api
        </p>
      </div> */}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2">Loading employees data...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b">Name</th>
                <th className="py-2 px-4 border-b">Username</th>
                <th className="py-2 px-4 border-b">Email</th>
                <th className="py-2 px-4 border-b">Phone</th>
                <th className="py-2 px-4 border-b">Address</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <tr key={employee._id}>
                    <td className="py-2 px-4 border-b">{employee.name}</td>
                    <td className="py-2 px-4 border-b">{employee.username}</td>
                    <td className="py-2 px-4 border-b">{employee.email}</td>
                    <td className="py-2 px-4 border-b">{employee.phone}</td>
                    <td className="py-2 px-4 border-b">{employee.address}</td>
                    <td className="py-2 px-4 border-b flex space-x-2">
                      <button
                        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded"
                        onClick={() => {
                          // Implement edit modal or functionality here
                          // For example, you could set an editingEmployee state and open the modal
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                        onClick={() => handleDeleteEmployee(employee._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-4 text-center">
                    No employees found. {error ? "Please fix the connection error and try again." : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Employee</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={newEmployee.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={newEmployee.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={newEmployee.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={newEmployee.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Phone</label>
              <input
                type="text"
                name="phone"
                value={newEmployee.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Address</label>
              <input
                type="text"
                name="address"
                value={newEmployee.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleAddEmployee}
                disabled={isLoading}
              >
                {isLoading ? "Adding..." : "Add Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;