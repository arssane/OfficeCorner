import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaSync } from "react-icons/fa";
import axios from "axios";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]); // New state for departments
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false); // New modal for departments
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiBaseUrl] = useState("http://localhost:5000/api"); // apiBaseUrl can be constant
  
  const [newEmployee, setNewEmployee] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    department: "", // New field for department
  });

  const [currentEditingEmployee, setCurrentEditingEmployee] = useState(null); // For employee editing
  
  const [newDepartment, setNewDepartment] = useState({ // New state for new department form
    name: "",
    description: "",
    code: "",
    manager: "",
    budget: 0,
    location: "",
  });

  const [currentEditingDepartment, setCurrentEditingDepartment] = useState(null); // For department editing


  // Fetch employees and departments on component mount
  useEffect(() => {
    fetchEmployees();
    fetchDepartments(); // Fetch departments on load
  }, [apiBaseUrl]);

  // Fetch all employees with better error handling
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
      try {
        response = await axios.get(`${apiBaseUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });
      } catch (firstError) {
        try {
          response = await axios.get(`${apiBaseUrl}/auth/users`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
        } catch (secondError) {
          response = await axios.get(`${apiBaseUrl}/employee`, { // Changed to /employee as per common practice
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
        }
      }

      const allUsers = response.data.data || response.data; // Adjust based on actual API response structure
      const employeeUsers = allUsers.filter(user => user.role === 'Employee');

      setEmployees(employeeUsers);
      setError("");
    } catch (err) {
      console.error("Error fetching employees:", err);
      handleApiError(err, "fetching employees");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all departments
  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${apiBaseUrl}/department`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      setDepartments(response.data.data); // Assuming data is nested under 'data'
      setError("");
    } catch (err) {
      console.error("Error fetching departments:", err);
      handleApiError(err, "fetching departments");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiError = (err, action) => {
    if (err.response) {
      if (err.response.status === 404) {
        setError(`API endpoint not found for ${action}. Please check your backend routes.`);
      } else if (err.response.status === 401 || err.response.status === 403) {
        setError("Authentication failed. Please log in again.");
      } else {
        setError(`Server error during ${action}: ${err.response.data.message || err.message}`);
      }
    } else if (err.request) {
      setError(`No response from server during ${action}. Please check if the server is running.`);
    } else {
      setError(`Error during ${action}: ${err.message}`);
    }
    setIsLoading(false);
  };

  // Handle Input Change for Employees
  const handleEmployeeChange = (e) => {
    setNewEmployee({ ...newEmployee, [e.target.name]: e.target.value });
  };

  // Handle Input Change for Departments
  const handleDepartmentChange = (e) => {
    setNewDepartment({ ...newDepartment, [e.target.name]: e.target.value });
  };

  // Add Employee Function
  const handleAddEmployee = async () => {
    try {
      setIsLoading(true);

      if (Object.values(newEmployee).some((value) => value === "" && value !== 0)) { // Allow 0 for budget
        setError("Please fill out all required fields!");
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }
      
      const employeeData = {
        ...newEmployee,
        role: 'Employee' // Ensure role is set to Employee
      };
      
      // If a password is required for new user registration, add it here.
      // Based on server.js seed, a password is 'saniya123'. You might want a default or a field in the form.
      // For simplicity, let's assume registration handles a default password or it's not strictly required by the auth/register route
      // if (!employeeData.password) employeeData.password = "defaultpassword123"; // Example: add a default password if not provided by UI


      await axios.post(
        `${apiBaseUrl}/auth/register`,
        employeeData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await fetchEmployees(); // Refresh the employee list after adding
      setNewEmployee({ username: "", name: "", email: "", phone: "", address: "", department: "" });
      setIsEmployeeModalOpen(false);
      setError("");
    } catch (err) {
      console.error("Error adding employee:", err);
      handleApiError(err, "adding employee");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Authentication token not found. Please log in again.");
          setIsLoading(false);
          return;
        }

        // Try different delete endpoints
        try {
          await axios.delete(`${apiBaseUrl}/users/${id}`, { // Assuming this is the correct endpoint for users
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
        } catch (firstError) {
          await axios.delete(`${apiBaseUrl}/auth/users/${id}`, { // Fallback to auth endpoint
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
        }
        
        await fetchEmployees(); // Refresh the employee list
        setError("");
      } catch (err) {
        console.error("Error deleting employee:", err);
        handleApiError(err, "deleting employee");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditEmployee = async () => {
    if (!currentEditingEmployee) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }
      
      const updatedData = { ...currentEditingEmployee };
      // Ensure department is set to null if empty string
      if (updatedData.department === "") {
        updatedData.department = null;
      }


      await axios.put(
        `${apiBaseUrl}/users/${currentEditingEmployee._id}`, // Assuming this is the correct endpoint for updating users
        updatedData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      await fetchEmployees(); // Refresh the employee list
      setCurrentEditingEmployee(null);
      setIsEmployeeModalOpen(false);
      setError("");
    } catch (err) {
      console.error("Error updating employee:", err);
      handleApiError(err, "updating employee");
    } finally {
      setIsLoading(false);
    }
  };

  // Department Management Functions
  const handleAddDepartment = async () => {
    try {
      setIsLoading(true);
      if (!newDepartment.name || !newDepartment.code) {
        setError("Department name and code are required.");
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      const departmentDataToSend = { ...newDepartment };
      // Ensure manager is set to null if empty string
      if (departmentDataToSend.manager === "") {
        departmentDataToSend.manager = null;
      }


      await axios.post(
        `${apiBaseUrl}/department`,
        departmentDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await fetchDepartments();
      setNewDepartment({ name: "", description: "", code: "", manager: "", budget: 0, location: "" });
      setIsDepartmentModalOpen(false);
      setError("");
    } catch (err) {
      console.error("Error adding department:", err);
      handleApiError(err, "adding department");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDepartment = async () => {
    if (!currentEditingDepartment) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      const departmentDataToUpdate = { ...currentEditingDepartment };
      // Ensure manager is set to null if empty string
      if (departmentDataToUpdate.manager === "") {
        departmentDataToUpdate.manager = null;
      }

      await axios.put(
        `${apiBaseUrl}/department/${currentEditingDepartment._id}`,
        departmentDataToUpdate,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      await fetchDepartments();
      setCurrentEditingDepartment(null);
      setIsDepartmentModalOpen(false);
      setError("");
    } catch (err) {
      console.error("Error updating department:", err);
      handleApiError(err, "updating department");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication token not found. Please log in again.");
          setIsLoading(false);
          return;
        }

        await axios.delete(`${apiBaseUrl}/department/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });

        await fetchDepartments();
        await fetchEmployees(); // Refresh employees in case some were in this department
        setError("");
      } catch (err) {
        console.error("Error deleting department:", err);
        handleApiError(err, "deleting department");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRetryConnection = () => {
    setError("");
    fetchEmployees();
    fetchDepartments();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <div className="space-x-2">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              setCurrentEditingEmployee(null);
              setNewEmployee({ username: "", name: "", email: "", phone: "", address: "", department: "" });
              setIsEmployeeModalOpen(true);
            }}
          >
            Add Employee
          </button>
          <button
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              setCurrentEditingDepartment(null);
              setNewDepartment({ name: "", description: "", code: "", manager: "", budget: 0, location: "" });
              setIsDepartmentModalOpen(true);
            }}
          >
            Manage Departments
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button
            onClick={handleRetryConnection}
            className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
          >
            Retry Connection
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2">Loading data...</p>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-3">Employees</h2>
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Username</th>
                  <th className="py-2 px-4 border-b">Email</th>
                  <th className="py-2 px-4 border-b">Phone</th>
                  <th className="py-2 px-4 border-b">Address</th>
                  <th className="py-2 px-4 border-b">Department</th> {/* New column */}
                  <th className="py-2 px-4 border-b">Role</th>
                  <th className="py-2 px-4 border-b">Status</th>
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
                      <td className="py-2 px-4 border-b">
                        {employee.department ? 
                          (departments.find(dept => dept._id === employee.department)?.name || "N/A") 
                          : "N/A"}
                      </td>
                      <td className="py-2 px-4 border-b">{employee.role}</td>
                      <td className="py-2 px-4 border-b">
                        <span className={`px-2 py-1 rounded text-xs ${
                          employee.status === 'pending'
                            ? 'bg-yellow-200 text-yellow-800'
                            : employee.status === 'approved'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {employee.status || 'active'}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b flex space-x-2">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded"
                          onClick={() => {
                            setCurrentEditingEmployee(employee);
                            setNewEmployee(employee); // Populate the form for editing
                            setIsEmployeeModalOpen(true);
                          }}
                        >
                          <FaEdit size={18} />
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                          onClick={() => handleDeleteEmployee(employee._id)}
                        >
                          <FaTrash size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-4 text-center">
                      No employees found. {error ? "Please fix the connection error and try again." : ""}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-semibold mb-3 mt-8">Departments</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Code</th>
                  <th className="py-2 px-4 border-b">Description</th>
                  <th className="py-2 px-4 border-b">Manager</th>
                  <th className="py-2 px-4 border-b">Budget</th>
                  <th className="py-2 px-4 border-b">Location</th>
                  <th className="py-2 px-4 border-b">Active</th>
                  <th className="py-2 px-4 border-b">Employee Count</th>
                  <th className="py-2 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <tr key={dept._id}>
                      <td className="py-2 px-4 border-b">{dept.name}</td>
                      <td className="py-2 px-4 border-b">{dept.code}</td>
                      <td className="py-2 px-4 border-b">{dept.description}</td>
                      <td className="py-2 px-4 border-b">
                        {dept.manager ? dept.manager.name : "N/A"}
                      </td>
                      <td className="py-2 px-4 border-b">${dept.budget?.toLocaleString() || '0'}</td>
                      <td className="py-2 px-4 border-b">{dept.location}</td>
                      <td className="py-2 px-4 border-b">{dept.isActive ? "Yes" : "No"}</td>
                      <td className="py-2 px-4 border-b">{dept.employeeCount}</td>
                      <td className="py-2 px-4 border-b flex space-x-2">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded"
                          onClick={() => {
                            setCurrentEditingDepartment(dept);
                            setNewDepartment(dept); // Populate the form for editing
                            setIsDepartmentModalOpen(true);
                          }}
                        >
                          <FaEdit size={18} />
                        </button>
                        <button
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                          onClick={() => handleDeleteDepartment(dept._id)}
                        >
                          <FaTrash size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-4 text-center">
                      No departments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Employee Add/Edit Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {currentEditingEmployee ? "Edit Employee" : "Add New Employee"}
            </h2>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={currentEditingEmployee ? currentEditingEmployee.username : newEmployee.username}
                onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, username: e.target.value}) : handleEmployeeChange(e)}
                className="w-full px-3 py-2 border rounded"
                disabled={!!currentEditingEmployee} // Disable username edit for existing employee if not allowed
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={currentEditingEmployee ? currentEditingEmployee.name : newEmployee.name}
                onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, name: e.target.value}) : handleEmployeeChange(e)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={currentEditingEmployee ? currentEditingEmployee.email : newEmployee.email}
                onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, email: e.target.value}) : handleEmployeeChange(e)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Phone</label>
              <input
                type="text"
                name="phone"
                value={currentEditingEmployee ? currentEditingEmployee.phone : newEmployee.phone}
                onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, phone: e.target.value}) : handleEmployeeChange(e)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Address</label>
              <input
                type="text"
                name="address"
                value={currentEditingEmployee ? currentEditingEmployee.address : newEmployee.address}
                onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, address: e.target.value}) : handleEmployeeChange(e)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Department</label>
              <select
                name="department"
                value={currentEditingEmployee ? (currentEditingEmployee.department || "") : newEmployee.department}
                onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, department: e.target.value}) : handleEmployeeChange(e)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select Department (Optional)</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            {currentEditingEmployee && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={currentEditingEmployee.status}
                  onChange={(e) => setCurrentEditingEmployee({...currentEditingEmployee, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => setIsEmployeeModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={currentEditingEmployee ? handleEditEmployee : handleAddEmployee}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : (currentEditingEmployee ? "Update Employee" : "Add Employee")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Add/Edit Modal */}
      {isDepartmentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {currentEditingDepartment ? "Edit Department" : "Add New Department"}
            </h2>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Department Name</label>
              <input
                type="text"
                name="name"
                value={currentEditingDepartment ? currentEditingDepartment.name : newDepartment.name}
                onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, name: e.target.value}) : handleDepartmentChange(e)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Department Code</label>
              <input
                type="text"
                name="code"
                value={currentEditingDepartment ? currentEditingDepartment.code : newDepartment.code}
                onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, code: e.target.value}) : handleDepartmentChange(e)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={currentEditingDepartment ? currentEditingDepartment.description : newDepartment.description}
                onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, description: e.target.value}) : handleDepartmentChange(e)}
                className="w-full px-3 py-2 border rounded"
                rows="3"
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Manager (Employee)</label>
              <select
                name="manager"
                value={currentEditingDepartment ? (currentEditingDepartment.manager?._id || currentEditingDepartment.manager || "") : newDepartment.manager}
                onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, manager: e.target.value}) : handleDepartmentChange(e)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select Manager (Optional)</option>
                {employees.filter(emp => emp.role === 'Employee' || emp.role === 'Administrator').map((emp) => ( // Managers can be employees or admins
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Budget</label>
              <input
                type="number"
                name="budget"
                value={currentEditingDepartment ? currentEditingDepartment.budget : newDepartment.budget}
                onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, budget: Number(e.target.value)}) : handleDepartmentChange(e)}
                className="w-full px-3 py-2 border rounded"
                min="0"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={currentEditingDepartment ? currentEditingDepartment.location : newDepartment.location}
                onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, location: e.target.value}) : handleDepartmentChange(e)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            {currentEditingDepartment && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Is Active?</label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={currentEditingDepartment.isActive}
                  onChange={(e) => setCurrentEditingDepartment({...currentEditingDepartment, isActive: e.target.checked})}
                  className="mr-2"
                />
                <span>{currentEditingDepartment.isActive ? "Yes" : "No"}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => setIsDepartmentModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                onClick={currentEditingDepartment ? handleUpdateDepartment : handleAddDepartment}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : (currentEditingDepartment ? "Update Department" : "Add Department")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;