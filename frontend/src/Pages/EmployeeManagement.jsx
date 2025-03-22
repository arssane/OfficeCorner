import React, { useState } from "react";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([
    { username: "saniya", name: "Saniya Shrestha", email: "saniya@gmail.com", phone: "9841887799", address: "ktm" },
    { username: "arsha", name: "Arsha Shrestha", email: "arsha@gmail.com", phone: "9841552266", address: "ktm" },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // Handle Input Change
  const handleChange = (e) => {
    setNewEmployee({ ...newEmployee, [e.target.name]: e.target.value });
  };

  // Add Employee Function
  const handleAddEmployee = () => {
    if (Object.values(newEmployee).some((value) => value === "")) {
      alert("Please fill out all fields!");
      return;
    }
    setEmployees([...employees, newEmployee]);
    setNewEmployee({ username: "", name: "", email: "", phone: "", address: "" });
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen flex flex-col items-center">
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-4xl mb-6">
        <h2 className="text-3xl font-bold text-green-700">Employee Detail</h2>
        <button
          className="px-5 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition transform hover:scale-105"
          onClick={() => setIsModalOpen(true)}
        >
          + Add Employee
        </button>
      </div>

      {/* Employee Table */}
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-green-700 text-white text-md uppercase">
            <tr>
              <th className="py-4 px-6">Username</th>
              <th className="py-4 px-6">Name</th>
              <th className="py-4 px-6">Email</th>
              <th className="py-4 px-6">Pnumber</th>
              <th className="py-4 px-6">Address</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition duration-300">
                <td className="py-4 px-6">{emp.username}</td>
                <td className="py-4 px-6">{emp.name}</td>
                <td className="py-4 px-6">{emp.email}</td>
                <td className="py-4 px-6">{emp.phone}</td>
                <td className="py-4 px-6">{emp.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-xl font-bold text-green-700 mb-4">Add New Employee</h3>
            <input
              type="text"
              name="username"
              placeholder="Username"
              className="w-full mb-2 p-2 border rounded"
              value={newEmployee.username}
              onChange={handleChange}
            />
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              className="w-full mb-2 p-2 border rounded"
              value={newEmployee.name}
              onChange={handleChange}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="w-full mb-2 p-2 border rounded"
              value={newEmployee.email}
              onChange={handleChange}
            />
            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              className="w-full mb-2 p-2 border rounded"
              value={newEmployee.phone}
              onChange={handleChange}
            />
            <input
              type="text"
              name="address"
              placeholder="Address"
              className="w-full mb-4 p-2 border rounded"
              value={newEmployee.address}
              onChange={handleChange}
            />
            <div className="flex justify-between">
              <button
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                onClick={handleAddEmployee}
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
