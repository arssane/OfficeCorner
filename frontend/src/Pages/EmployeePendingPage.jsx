import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const EmployeePendingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState('');

  useEffect(() => {
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    // If no user data or user is not an employee, redirect
    if (!userData.id && !userData._id) {
      console.log('No user ID found, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (userData.role !== 'Employee') {
      console.log('User is not an employee, redirecting to login');
      navigate('/login');
      return;
    }

    // If employee is already approved, redirect to dashboard
    if (userData.status === 'approved') {
      navigate('/employee');
      return;
    }

    // If employee is rejected, show rejection message
    if (userData.status === 'rejected') {
      // Stay on this page to show rejection status
    }

    setUser(userData);

    // Initialize socket connection for real-time notifications
    const socketConnection = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    socketConnection.on('connect', () => {
      console.log('🔌 Connected to notification server');
      const userId = userData.id || userData._id;
      socketConnection.emit('join', userId);
    });

    // Listen for registration updates
    socketConnection.on('registrationUpdate', (data) => {
      console.log('📧 Received notification:', data);
      
      if (data.type === 'approval') {
        toast.success(data.message, {
          position: "top-right",
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: {
            fontSize: '16px',
            fontWeight: '500'
          }
        });
        
        // Update user status in localStorage
        const updatedUser = { ...userData, status: 'approved' };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        // Redirect to employee dashboard after approval
        setTimeout(() => {
          navigate('/employee');
        }, 3000);
        
      } else if (data.type === 'rejection') {
        toast.error(data.message, {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: {
            fontSize: '16px',
            fontWeight: '500'
          }
        });
        
        // Update user status in localStorage
        const updatedUser = { ...userData, status: 'rejected' };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    });

    socketConnection.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    setSocket(socketConnection);

    // Calculate time elapsed since registration
    const updateTimeElapsed = () => {
      if (userData.createdAt) {
        const now = new Date();
        const created = new Date(userData.createdAt);
        const diffMs = now - created;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHours > 0) {
          setTimeElapsed(`${diffHours} hour${diffHours > 1 ? 's' : ''} and ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`);
        } else {
          setTimeElapsed(`${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`);
        }
      }
    };

    updateTimeElapsed();
    const interval = setInterval(updateTimeElapsed, 60000); // Update every minute

    // Cleanup
    return () => {
      if (socketConnection) {
        socketConnection.disconnect();
      }
      clearInterval(interval);
    };
  }, [navigate]);

  const handleLogout = () => {
    // Clear all user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('employeeId');
    localStorage.removeItem('employeeName');
    localStorage.removeItem('employeeEmail');
    localStorage.removeItem('employeeDepartment');
    localStorage.removeItem('employeePosition');
    
    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }
    
    navigate('/login');
  };

  const handleContactAdmin = () => {
    // You can implement this to open a contact form or redirect to support
    toast.info('Please contact your system administrator for assistance.', {
      position: "top-right",
      autoClose: 4000,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Employee Portal</h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            {user.status === 'pending' && (
              <svg className="h-8 w-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {user.status === 'approved' && (
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {user.status === 'rejected' && (
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.name}!
          </h2>
          
          <p className="text-lg text-gray-600">
            Employee ID: {user.username}
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          {user.status === 'pending' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 mb-4">
                  <svg className="h-4 w-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Registration Pending
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Your registration is under review
              </h3>
              
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Thank you for registering as an employee! Your account is currently pending administrator approval. 
                You will receive a real-time notification once your account has been reviewed.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-blue-800 text-sm">
                    <strong>Stay on this page</strong> to receive instant notifications about your approval status
                  </p>
                </div>
              </div>
              
              {timeElapsed && (
                <p className="text-sm text-gray-500 mb-6">
                  Registration submitted {timeElapsed}
                </p>
              )}
            </div>
          )}

          {user.status === 'approved' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-4">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Registration Approved
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                🎉 Congratulations! Your account has been approved
              </h3>
              
              <p className="text-gray-600 mb-6">
                You now have access to the employee dashboard and all employee features.
              </p>
              
              <button
                onClick={() => navigate('/employee')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition duration-200"
              >
                Access Employee Dashboard
              </button>
            </div>
          )}

          {user.status === 'rejected' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 mb-4">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Registration Rejected
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Registration Not Approved
              </h3>
              
              <p className="text-gray-600 mb-6">
                Unfortunately, your employee registration has been rejected. 
                Please contact your administrator for more information about the next steps.
              </p>
              
              {user.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800 text-sm">
                    <strong>Reason:</strong> {user.rejectionReason}
                  </p>
                </div>
              )}
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleContactAdmin}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition duration-200"
                >
                  Contact Administrator
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md font-medium transition duration-200"
                >
                  Register Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Information Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Registration Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Full Name</p>
              <p className="text-gray-900">{user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Username</p>
              <p className="text-gray-900">{user.username}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <p className="text-gray-900">{user.role}</p>
            </div>
            {user.phone && (
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="text-gray-900">{user.phone}</p>
              </div>
            )}
            {user.address && (
              <div>
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-gray-900">{user.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Real-time notification indicator */}
        {user.status === 'pending' && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center text-sm text-gray-600">
              <div className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Connected - Waiting for real-time updates
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmployeePendingPage;