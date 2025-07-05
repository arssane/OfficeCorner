import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import axios from "axios";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDepartmentDetailsModalOpen, setIsDepartmentDetailsModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentEmployees, setDepartmentEmployees] = useState([]);
  const [isAddingEmployeeToDept, setIsAddingEmployeeToDept] = useState(false);
  const [selectedEmployeeForDept, setSelectedEmployeeForDept] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [managerSearchQuery, setManagerSearchQuery] = useState("");
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [apiBaseUrl] = useState("http://localhost:5000/api");

  const [newEmployee, setNewEmployee] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    department: "",
  });

  const [currentEditingEmployee, setCurrentEditingEmployee] = useState(null);

  const [newDepartment, setNewDepartment] = useState({
    name: "",
    description: "",
    code: "",
    manager: "",
    location: "",
  });

  const [currentEditingDepartment, setCurrentEditingDepartment] = useState(null);

  // Fetch employees and departments on component mount
  useEffect(() => {
    const initData = async () => {
      // Ensure departments are fetched first so employee department names can be resolved
      await fetchDepartments();
      await fetchEmployees();
    };
    initData();
  }, [apiBaseUrl]);

  // Handle clicks outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close employee dropdown if click is outside its container
      const employeeDropdownContainer = document.querySelector('.employee-dropdown-container');
      if (showEmployeeDropdown && employeeDropdownContainer && !employeeDropdownContainer.contains(event.target)) {
        setShowEmployeeDropdown(false);
      }

      // Close manager dropdown if click is outside its container
      const managerDropdownContainer = document.querySelector('.manager-dropdown-container');
      if (showManagerDropdown && managerDropdownContainer && !managerDropdownContainer.contains(event.target)) {
        setShowManagerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmployeeDropdown, showManagerDropdown]);

  const getAvailableEmployees = () => {
    return employees.filter(emp => emp.department !== selectedDepartment._id);
  };

  // fetchDepartmentEmployees now accepts an optional 'allEmployees' array
  // This ensures it uses the most up-to-date employee data if provided
  const fetchDepartmentEmployees = async (departmentId, allEmployees = employees) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        return;
      }

      // Filter employees by department from the provided allEmployees array
      const deptEmployees = allEmployees.filter(emp => emp.department === departmentId);
      setDepartmentEmployees(deptEmployees);
      setError("");
    } catch (err) {
      console.error("Error fetching department employees:", err);
      handleApiError(err, "fetching department employees");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployeeToDepartment = async () => {
    try {
      setIsLoading(true);

      if (!selectedEmployeeForDept) {
        setError("Please select an employee to add to the department!");
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      // Call the new backend endpoint for updating department and sending email
      await axios.put(
        `${apiBaseUrl}/auth/users/${selectedEmployeeForDept}/department`, // New endpoint
        { department: selectedDepartment._id }, // Pass the new department ID
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      // Refresh data: First fetch all employees, then use the returned data to update department employees
      const updatedEmployees = await fetchEmployees();
      await fetchDepartmentEmployees(selectedDepartment._id, updatedEmployees);
      
      // Reset form
      setSelectedEmployeeForDept("");
      setIsAddingEmployeeToDept(false);
      setError("");
    } catch (err) {
      console.error("Error adding employee to department:", err);
      handleApiError(err, "adding employee to department");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromDepartment = async (employeeId) => {
    // Using a custom modal/confirmation instead of window.confirm
    const confirmRemove = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm transform transition-all duration-300 scale-100">
          <h2 class="text-xl font-bold text-red-700 mb-4">Confirm Removal</h2>
          <p class="text-gray-700 mb-6">Are you sure you want to remove this employee from the department?</p>
          <div class="flex justify-end space-x-3">
            <button id="cancelBtn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">Cancel</button>
            <button id="confirmBtn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300">Remove</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
      document.getElementById('confirmBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
    });

    if (confirmRemove) {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication token not found. Please log in again.");
          return;
        }

        // Call the new backend endpoint for updating department and sending email
        await axios.put(
          `${apiBaseUrl}/auth/users/${employeeId}/department`, // New endpoint
          { department: null }, // Pass null to remove from department
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        // Refresh data: First fetch all employees, then use the returned data to update department employees
        const updatedEmployees = await fetchEmployees();
        await fetchDepartmentEmployees(selectedDepartment._id, updatedEmployees);
        setError("");
      } catch (err) {
        console.error("Error removing employee from department:", err);
        handleApiError(err, "removing employee from department");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Fetch all employees with better error handling
  // This function now returns the fetched employee data
  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return []; // Return empty array on error
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
          response = await axios.get(`${apiBaseUrl}/employee`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
        }
      }

      const allUsers = response.data.data || response.data;
      const employeeUsers = allUsers.filter(user => user.role === 'Employee');

      setEmployees(employeeUsers);
      setError("");
      return employeeUsers; // Return the fetched data
    } catch (err) {
      console.error("Error fetching employees:", err);
      handleApiError(err, "fetching employees");
      return []; // Return empty array on error
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
      setDepartments(response.data.data);
      console.log("Fetched Departments:", response.data.data); // Log fetched departments
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

      if (Object.values(newEmployee).some((value) => value === "" && value !== 0)) {
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
        role: 'Employee'
      };

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

      await fetchEmployees();
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
    // Using a custom modal/confirmation instead of window.confirm
    const confirmDelete = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm transform transition-all duration-300 scale-100">
          <h2 class="text-xl font-bold text-red-700 mb-4">Confirm Deletion</h2>
          <p class="text-gray-700 mb-6">Are you sure you want to delete this employee?</p>
          <div class="flex justify-end space-x-3">
            <button id="cancelBtn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">Cancel</button>
            <button id="confirmBtn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300">Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
      document.getElementById('confirmBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
    });

    if (confirmDelete) {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Authentication token not found. Please log in again.");
          setIsLoading(false);
          return;
        }

        try {
          await axios.delete(`${apiBaseUrl}/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
        } catch (firstError) {
          await axios.delete(`${apiBaseUrl}/auth/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
        }

        await fetchEmployees();
        setError("");
      } catch (err) {
        console.error("Error deleting employee:", err);
        handleApiError(err, "deleting employee");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getFilteredAvailableEmployees = () => {
    const availableEmployees = employees.filter(emp => emp.department !== selectedDepartment._id);
    
    if (!employeeSearchQuery.trim()) {
      return availableEmployees;
    }
    
    return availableEmployees.filter(employee =>
      employee.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
      employee.username.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(employeeSearchQuery.toLowerCase())
    );
  };

  const getFilteredManagers = () => {
    const managers = employees.filter(emp => emp.role === 'Employee' || emp.role === 'Administrator');
    
    if (!managerSearchQuery.trim()) {
      return managers;
    }
    
    return managers.filter(manager =>
      manager.name.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
      manager.username.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
      manager.email.toLowerCase().includes(managerSearchQuery.toLowerCase())
    );
  };

  const handleManagerSelect = (manager) => {
    if (currentEditingDepartment) {
      setCurrentEditingDepartment({...currentEditingDepartment, manager: manager._id});
    } else {
      setNewDepartment({...newDepartment, manager: manager._id});
    }
    setManagerSearchQuery(manager.name);
    setShowManagerDropdown(false);
  };

  const clearManagerSearch = () => {
    setManagerSearchQuery("");
    if (currentEditingDepartment) {
      setCurrentEditingDepartment({...currentEditingDepartment, manager: ""});
    } else {
      setNewDepartment({...newDepartment, manager: ""});
    }
    setShowManagerDropdown(false);
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployeeForDept(employee._id);
    setEmployeeSearchQuery(employee.name);
    setShowEmployeeDropdown(false);
  };

  const clearEmployeeSearch = () => {
    setEmployeeSearchQuery("");
    setSelectedEmployeeForDept("");
    setShowEmployeeDropdown(false);
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
      // If department is being set to empty, send null
      const departmentToSend = updatedData.department === "" ? null : updatedData.department;

      // Check if department has changed
      const originalEmployee = employees.find(emp => emp._id === currentEditingEmployee._id);
      const originalDepartmentId = originalEmployee ? (originalEmployee.department || null) : null;
      const departmentChanged = departmentToSend !== originalDepartmentId;

      // If department changed, use the new dedicated endpoint
      if (departmentChanged) {
        await axios.put(
          `${apiBaseUrl}/auth/users/${currentEditingEmployee._id}/department`,
          { department: departmentToSend },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        // Remove department from updatedData so it's not sent twice or incorrectly
        delete updatedData.department; 
      }

      // Update other employee details using the general user update endpoint
      // Only send other fields if they are present and not just the department
      if (Object.keys(updatedData).length > 1 || !departmentChanged) { // If there are other fields or department didn't change
        await axios.put(
          `${apiBaseUrl}/users/${currentEditingEmployee._id}`,
          updatedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
      }


      await fetchEmployees();
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
      setNewDepartment({ name: "", description: "", code: "", manager: "", location: "" });
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
    // Using a custom modal/confirmation instead of window.confirm
    const confirmDelete = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm transform transition-all duration-300 scale-100">
          <h2 class="text-xl font-bold text-red-700 mb-4">Confirm Deletion</h2>
          <p class="text-gray-700 mb-6">Are you sure you want to delete this department?</p>
          <div class="flex justify-end space-x-3">
            <button id="cancelBtn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">Cancel</button>
            <button id="confirmBtn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300">Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
      document.getElementById('confirmBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
    });

    if (confirmDelete) {
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
        await fetchEmployees();
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
    <div className="container mx-auto p-6 bg-gradient-to-br from-green-50 to-green-100 min-h-screen">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-md">
        <h1 className="text-3xl font-extrabold text-green-800">Employee & Department Management</h1>
        <div className="space-x-3">
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1"
            onClick={() => {
              setCurrentEditingEmployee(null);
              setNewEmployee({ username: "", name: "", email: "", phone: "", address: "", department: "" });
              setIsEmployeeModalOpen(true);
            }}
          >
            Add New Employee
          </button>
          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1"
            onClick={() => {
              setCurrentEditingDepartment(null);
              setNewDepartment({ name: "", description: "", code: "", manager: "", location: "" });
              setIsDepartmentModalOpen(true);
            }}
          >
            Manage Departments
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-5 py-4 rounded-lg mb-6 shadow-md">
          <p className="font-bold text-lg">Error:</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={handleRetryConnection}
            className="mt-4 bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out"
          >
            Retry Connection
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent"></div>
          <p className="mt-3 text-lg text-green-700">Loading data, please wait...</p>
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold text-green-700 mb-5">Current Employees</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border-collapse">
                <thead className="bg-green-100">
                  <tr>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Name</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Username</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Email</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Phone</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Address</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Department</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Role</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length > 0 ? (
                    employees.map((employee, index) => {
                      const departmentName = employee.department
                        ? (departments.find(dept => dept._id === employee.department)?.name || "N/A - Dept Not Found")
                        : "N/A - No Dept";
                      
                      console.log(`Employee: ${employee.name}, Department ID: ${employee.department}, Resolved Department Name: ${departmentName}`);

                      return (
                        <tr key={employee._id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="py-3 px-4 border-b border-gray-200">{employee.name}</td>
                          <td className="py-3 px-4 border-b border-gray-200">{employee.username}</td>
                          <td className="py-3 px-4 border-b border-gray-200">{employee.email}</td>
                          <td className="py-3 px-4 border-b border-gray-200">{employee.phone}</td>
                          <td className="py-3 px-4 border-b border-gray-200">{employee.address}</td>
                          <td className="py-3 px-4 border-b border-gray-200">
                            <span className={departmentName.includes("Not Found") || departmentName.includes("No Dept") ? "text-red-500 font-medium" : ""}>
                              {departmentName}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-b border-gray-200">{employee.role}</td>
                          <td className="py-3 px-4 border-b border-gray-200">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              employee.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : employee.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {employee.status || 'active'}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-b border-gray-200 flex space-x-2">
                            <button
                              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-md transition duration-300 ease-in-out transform hover:scale-105"
                              onClick={() => {
                                setCurrentEditingEmployee(employee);
                                setNewEmployee(employee); // Pre-fill form with employee data
                                setIsEmployeeModalOpen(true);
                              }}
                              title="Edit Employee"
                            >
                              <FaEdit size={16} />
                            </button>
                            <button
                              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-md transition duration-300 ease-in-out transform hover:scale-105"
                              onClick={() => handleDeleteEmployee(employee._id)}
                              title="Delete Employee"
                            >
                              <FaTrash size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="py-5 text-center text-gray-500">
                        No employees found. {error ? "Please fix the connection error and try again." : ""}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-green-700 mb-5">Departments</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border-collapse">
                <thead className="bg-green-100">
                  <tr>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Name</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Code</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Description</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Manager</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Location</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Active</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Employee Count</th>
                    <th className="py-3 px-4 border-b border-green-200 text-left text-sm font-medium text-green-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.length > 0 ? (
                    departments.map((dept, index) => (
                      <tr key={dept._id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="py-3 px-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{dept.name}</span>
                            <button
                              className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-md text-xs transition duration-300 ease-in-out ml-2"
                              onClick={() => {
                                setSelectedDepartment(dept);
                                fetchDepartmentEmployees(dept._id);
                                setIsDepartmentDetailsModalOpen(true);
                              }}
                              title="View Department Details"
                            >
                              View Details
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 border-b border-gray-200">{dept.code}</td>
                        <td className="py-3 px-4 border-b border-gray-200">{dept.description}</td>
                        <td className="py-3 px-4 border-b border-gray-200">
                          {dept.manager ? dept.manager.name : "N/A"}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-200">{dept.location}</td>
                        <td className="py-3 px-4 border-b border-gray-200">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            dept.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {dept.isActive ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="py-3 px-4 border-b border-gray-200">
                          <span className="bg-blue-100 text-green-800 px-2 py-1 rounded-full text-sm font-semibold">
                            {employees.filter(emp => emp.department === dept._id).length}
                          </span>
                        </td>
                        <td className="py-3 px-4 border-b border-gray-200 flex space-x-2">
                          <button
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-md transition duration-300 ease-in-out transform hover:scale-105"
                            onClick={() => {
                              setCurrentEditingDepartment(dept);
                              setNewDepartment(dept);
                              setIsDepartmentModalOpen(true);
                            }}
                            title="Edit Department"
                          >
                            <FaEdit size={16} />
                          </button>
                          <button
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-md transition duration-300 ease-in-out transform hover:scale-105"
                            onClick={() => handleDeleteDepartment(dept._id)}
                            title="Delete Department"
                          >
                            <FaTrash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="py-5 text-center text-gray-500">
                        No departments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Employee Add/Edit Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
            <h2 className="text-2xl font-bold text-green-700 mb-6 text-center">
              {currentEditingEmployee ? "Edit Employee Details" : "Add New Employee"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  value={currentEditingEmployee ? currentEditingEmployee.username : newEmployee.username}
                  onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, username: e.target.value}) : handleEmployeeChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                  disabled={!!currentEditingEmployee}
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={currentEditingEmployee ? currentEditingEmployee.name : newEmployee.name}
                  onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, name: e.target.value}) : handleEmployeeChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={currentEditingEmployee ? currentEditingEmployee.email : newEmployee.email}
                  onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, email: e.target.value}) : handleEmployeeChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={currentEditingEmployee ? currentEditingEmployee.phone : newEmployee.phone}
                  onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, phone: e.target.value}) : handleEmployeeChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Address</label>
                <input
                  type="text"
                  name="address"
                  value={currentEditingEmployee ? currentEditingEmployee.address : newEmployee.address}
                  onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, address: e.target.value}) : handleEmployeeChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Department</label>
                <select
                  name="department"
                  value={currentEditingEmployee ? (currentEditingEmployee.department || "") : newEmployee.department}
                  onChange={(e) => currentEditingEmployee ? setCurrentEditingEmployee({...currentEditingEmployee, department: e.target.value}) : handleEmployeeChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 bg-white"
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
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Status</label>
                  <select
                    name="status"
                    value={currentEditingEmployee.status}
                    onChange={(e) => setCurrentEditingEmployee({...currentEditingEmployee, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-5 rounded-lg transition duration-300 ease-in-out"
                onClick={() => setIsEmployeeModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100">
            <h2 className="text-2xl font-bold text-emerald-700 mb-6 text-center">
              {currentEditingDepartment ? "Edit Department Details" : "Add New Department"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Department Name</label>
                <input
                  type="text"
                  name="name"
                  value={currentEditingDepartment ? currentEditingDepartment.name : newDepartment.name}
                  onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, name: e.target.value}) : handleDepartmentChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Department Code</label>
                <input
                  type="text"
                  name="code"
                  value={currentEditingDepartment ? currentEditingDepartment.code : newDepartment.code}
                  onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, code: e.target.value}) : handleDepartmentChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Description</label>
                <textarea
                  name="description"
                  value={currentEditingDepartment ? currentEditingDepartment.description : newDepartment.description}
                  onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, description: e.target.value}) : handleDepartmentChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-200"
                  rows="3"
                ></textarea>
              </div>

              <div className="manager-dropdown-container relative">
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Search & Select Manager (Optional)
                </label>
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, username, or email..."
                    value={managerSearchQuery}
                    onChange={(e) => {
                      setManagerSearchQuery(e.target.value);
                      setShowManagerDropdown(true);
                      if (!e.target.value.trim()) {
                        if (currentEditingDepartment) {
                          setCurrentEditingDepartment({...currentEditingDepartment, manager: ""});
                        } else {
                          setNewDepartment({...newDepartment, manager: ""});
                        }
                      }
                    }}
                    onFocus={() => setShowManagerDropdown(true)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                  
                  {managerSearchQuery && (
                    <button
                      type="button"
                      onClick={clearManagerSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
                    >
                      ×
                    </button>
                  )}
                  
                  {showManagerDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {getFilteredManagers().length > 0 ? (
                        getFilteredManagers().map((manager) => (
                          <div
                            key={manager._id}
                            onClick={() => handleManagerSelect(manager)}
                            className="px-3 py-2 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{manager.name}</span>
                              <span className="text-sm text-gray-600">
                                @{manager.username} • {manager.email}
                              </span>
                              <span className="text-xs text-gray-500">
                                Role: {manager.role} • Current Dept: {
                                  manager.department 
                                    ? departments.find(dept => dept._id === manager.department)?.name || "Unknown"
                                    : "None"
                                }
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-center">
                          {managerSearchQuery ? "No managers found matching your search" : "No available managers"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {(currentEditingDepartment?.manager || newDepartment.manager) && (
                  <div className="bg-emerald-50 p-3 rounded-lg mt-2">
                    <h5 className="font-semibold text-emerald-800 mb-2">Selected Manager:</h5>
                    {(() => {
                      const selectedManagerId = currentEditingDepartment?.manager || newDepartment.manager;
                      const selectedManager = employees.find(emp => emp._id === selectedManagerId);
                      return selectedManager ? (
                        <div className="text-sm text-emerald-700">
                          <p><strong>Name:</strong> {selectedManager.name}</p>
                          <p><strong>Email:</strong> {selectedManager.email}</p>
                          <p><strong>Role:</strong> {selectedManager.role}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={currentEditingDepartment ? currentEditingDepartment.location : newDepartment.location}
                  onChange={(e) => currentEditingDepartment ? setCurrentEditingDepartment({...currentEditingDepartment, location: e.target.value}) : handleDepartmentChange(e)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition duration-200"
                />
              </div>

              {currentEditingDepartment && (
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={currentEditingDepartment.isActive}
                    onChange={(e) => setCurrentEditingDepartment({...currentEditingDepartment, isActive: e.target.checked})}
                    className="mr-3 h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-gray-700 text-sm font-semibold">Is Active?</label>
                  <span className="ml-2 text-sm text-gray-600">({currentEditingDepartment.isActive ? "Yes" : "No"})</span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-5 rounded-lg transition duration-300 ease-in-out"
                onClick={() => setIsDepartmentModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-lg transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={currentEditingDepartment ? handleUpdateDepartment : handleAddDepartment}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : (currentEditingDepartment ? "Update Department" : "Add Department")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Details Modal */}
      {isDepartmentDetailsModalOpen && selectedDepartment && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-green-700">
                {selectedDepartment.name} Department Details
              </h2>
              <button
                onClick={() => setIsDepartmentDetailsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Department Info */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Code:</strong> {selectedDepartment.code}</p>
                  <p><strong>Manager:</strong> {selectedDepartment.manager?.name || "N/A"}</p>
                </div>
                <div>
                  <p><strong>Location:</strong> {selectedDepartment.location}</p>
                  <p><strong>Status:</strong> {selectedDepartment.isActive ? "Active" : "Inactive"}</p>
                  <p><strong>Total Employees:</strong> {departmentEmployees.length}</p>
                </div>
              </div>
              {selectedDepartment.description && (
                <div className="mt-3">
                  <p><strong>Description:</strong> {selectedDepartment.description}</p>
                </div>
              )}
            </div>

            {/* Add Employee Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-green-700">Department Employees</h3>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300"
                  onClick={() => setIsAddingEmployeeToDept(true)}
                >
                  Add Employee to Department
                </button>
              </div>

              {/* Add Employee Form */}
              {isAddingEmployeeToDept && (
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <h4 className="text-lg font-semibold mb-3">Add Existing Employee to {selectedDepartment.name}</h4>
                <div className="space-y-4">
                  <div className="employee-dropdown-container relative"> {/* Added a class for targeting */}
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Search & Select Employee
                    </label>
                    
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by name, username, or email..."
                        value={employeeSearchQuery}
                        onChange={(e) => {
                          setEmployeeSearchQuery(e.target.value);
                          setShowEmployeeDropdown(true);
                          if (!e.target.value.trim()) {
                            setSelectedEmployeeForDept("");
                          }
                        }}
                        onFocus={() => setShowEmployeeDropdown(true)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                      />
                      
                      {/* Clear button */}
                      {employeeSearchQuery && (
                        <button
                          type="button"
                          onClick={clearEmployeeSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      )}
                      
                      {/* Dropdown with search results */}
                      {showEmployeeDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {getFilteredAvailableEmployees().length > 0 ? (
                            getFilteredAvailableEmployees().map((employee) => (
                              <div
                                key={employee._id}
                                onClick={() => handleEmployeeSelect(employee)}
                                className="px-3 py-2 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900">{employee.name}</span>
                                  <span className="text-sm text-gray-600">
                                    @{employee.username} • {employee.email}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Current Dept: {
                                      employee.department 
                                        ? departments.find(dept => dept._id === employee.department)?.name || "Unknown"
                                        : "None"
                                    }
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500 text-center">
                              {employeeSearchQuery ? "No employees found matching your search" : "No available employees"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {getFilteredAvailableEmployees().length === 0 && !employeeSearchQuery && (
                      <p className="text-sm text-gray-500 mt-2">
                        No available employees to assign. All employees are already assigned to departments.
                      </p>
                    )}
                  </div>
                  
                  {/* Show selected employee details */}
                  {selectedEmployeeForDept && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h5 className="font-semibold text-green-800 mb-2">Selected Employee Details:</h5>
                      {(() => {
                        const selectedEmp = employees.find(emp => emp._id === selectedEmployeeForDept);
                        return selectedEmp ? (
                          <div className="text-sm text-green-700">
                            <p><strong>Name:</strong> {selectedEmp.name}</p>
                            <p><strong>Email:</strong> {selectedEmp.email}</p>
                            <p><strong>Phone:</strong> {selectedEmp.phone}</p>
                            <p><strong>Current Department:</strong> {
                              selectedEmp.department 
                                ? departments.find(dept => dept._id === selectedEmp.department)?.name || "Unknown"
                                : "None"
                            }</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                    onClick={() => {
                      setIsAddingEmployeeToDept(false);
                      setSelectedEmployeeForDept("");
                      setEmployeeSearchQuery("");
                      setShowEmployeeDropdown(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition duration-300"
                    onClick={handleAddEmployeeToDepartment}
                    disabled={isLoading || !selectedEmployeeForDept || getFilteredAvailableEmployees().length === 0}
                  >
                    {isLoading ? "Assigning..." : "Assign to Department"}
                  </button>
                </div>
              </div>
            )}

              {/* Employees Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border-collapse">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="py-2 px-3 border-b text-left text-sm font-medium text-green-800">Name</th>
                      <th className="py-2 px-3 border-b text-left text-sm font-medium text-green-800">Username</th>
                      <th className="py-2 px-3 border-b text-left text-sm font-medium text-green-800">Email</th>
                      <th className="py-2 px-3 border-b text-left text-sm font-medium text-green-800">Phone</th>
                      <th className="py-2 px-3 border-b text-left text-sm font-medium text-green-800">Status</th>
                      <th className="py-2 px-3 border-b text-left text-sm font-medium text-green-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentEmployees.length > 0 ? (
                      departmentEmployees.map((employee, index) => (
                        <tr key={employee._id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="py-2 px-3 border-b">{employee.name}</td>
                          <td className="py-2 px-3 border-b">{employee.username}</td>
                          <td className="py-2 px-3 border-b">{employee.email}</td>
                          <td className="py-2 px-3 border-b">{employee.phone}</td>
                          <td className="py-2 px-3 border-b">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              employee.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : employee.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {employee.status || 'active'}
                            </span>
                          </td>
                          <td className="py-2 px-3 border-b">
                            <button
                              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-xs transition duration-300"
                              onClick={() => handleRemoveFromDepartment(employee._id)}
                              title="Remove from Department"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-4 text-center text-gray-500">
                          No employees found in this department.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                onClick={() => setIsDepartmentDetailsModalOpen(false)}
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

export default EmployeeManagement;
