import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmployeeApproval = ({ onBack }) => {
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPendingEmployees();
  }, []);

  const fetchPendingEmployees = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/api/admin/pending-employees', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Handle the correct response structure from admin.js
      setPendingEmployees(response.data.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching pending employees:', error);
      setError('Failed to fetch pending employees');
      
      // Mock data for testing
      setPendingEmployees([
        {
          _id: '1',
          username: 'john_doe',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St, City',
          role: 'Employee',
          createdAt: new Date().toISOString(),
          status: 'pending'
        },
        {
          _id: '2',
          username: 'jane_smith',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+0987654321',
          address: '456 Oak Ave, Town',
          role: 'Employee',
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed approval handler
  const handleApproveEmployee = async (employeeId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Explicitly set status to 'approved'
      const response = await axios.put(
        `http://localhost:5000/api/admin/approve-employee/${employeeId}`, 
        { 
          status: 'approved',
          action: 'approve' // Additional field to ensure correct action
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Approval response:', response.data); // Debug log
      
      // Remove from pending list
      setPendingEmployees(prev => prev.filter(emp => emp._id !== employeeId));
      setSuccessMessage('Employee approved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Error approving employee:', error);
      setError(`Failed to approve employee: ${error.response?.data?.message || error.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Fixed rejection handler
  const handleRejectEmployee = async (employeeId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Explicitly set status to 'rejected'
      const response = await axios.put(
        `http://localhost:5000/api/admin/approve-employee/${employeeId}`, 
        { 
          status: 'rejected',
          action: 'reject' // Additional field to ensure correct action
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Rejection response:', response.data); // Debug log
      
      // Remove from pending list
      setPendingEmployees(prev => prev.filter(emp => emp._id !== employeeId));
      setSuccessMessage('Employee rejected successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
        if (error.response?.data?.statusCode === 'ACCOUNT_REJECTED') {
        setError('❌ Your account has been rejected. Please contact the administrator.');
        } else if (error.response?.data?.statusCode === 'ACCOUNT_PENDING') {
        setError('⏳ Your account is pending approval. Please wait for administrator approval.');
        } else if (error.response?.data?.statusCode === 'ACCOUNT_INACTIVE') {
        setError('🚫 Your account is not active. Please contact the administrator.');
        }
      console.error('Error rejecting employee:', error);
      setError(`Failed to reject employee: ${error.response?.data?.message || error.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-2 text-gray-600">Loading pending employees...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Employee Approval Management</h2>
        <p className="text-gray-600">Review and approve or reject pending employee registrations</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Pending Employees Count */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-yellow-800 font-medium">
            {pendingEmployees.length} employee{pendingEmployees.length !== 1 ? 's' : ''} waiting for approval
          </span>
        </div>
      </div>

      {/* Pending Employees List */}
      {pendingEmployees.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
          <p className="text-gray-500">All employee registrations have been processed.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-800 font-medium text-sm">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">@{employee.username}</div>
                          <div className="text-xs text-gray-400">{employee.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{employee.email}</div>
                      <div className="text-sm text-gray-500">{employee.phone}</div>
                      <div className="text-xs text-gray-400">{employee.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(employee.createdAt)}</div>
                      <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full inline-block mt-1">
                        Pending Approval
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveEmployee(employee._id)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors flex items-center"
                          title="Approve this employee"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectEmployee(employee._id)}
                          className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors flex items-center"
                          title="Reject this employee"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={fetchPendingEmployees}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh List
        </button>
      </div>
    </div>
  );
};

export default EmployeeApproval;