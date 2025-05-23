import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const GoogleSignupCompletion = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    address: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleUserData, setGoogleUserData] = useState(null);

  useEffect(() => {
    // Get Google user data from navigation state or localStorage
    const userData = location.state?.googleUser || JSON.parse(localStorage.getItem('tempGoogleUser') || '{}');
    
    if (!userData || !userData.email) {
      setError('Google authentication data not found. Please try again.');
      setTimeout(() => navigate('/signup'), 2000);
      return;
    }
    
    setGoogleUserData(userData);
    
    // Pre-fill name if available
    if (userData.name && !formData.username) {
      setFormData(prev => ({
        ...prev,
        username: userData.name.toLowerCase().replace(/\s+/g, '') || userData.email.split('@')[0]
      }));
    }
  }, [location.state, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.username || !formData.phone || !formData.address || !formData.role) {
      setError('Please complete all required fields');
      return false;
    }

    if (formData.role === 'Administrator') {
      setError('Administrator accounts cannot be created through registration. Please contact your system administrator.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm() || !googleUserData) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Combine Google data with form data
      const registrationData = {
        email: googleUserData.email,
        name: googleUserData.name,
        username: formData.username,
        phone: formData.phone,
        address: formData.address,
        role: formData.role,
        googleId: googleUserData.sub || googleUserData.id,
        isGoogleUser: true
      };
      
      console.log('Sending Google registration data:', registrationData);

      const response = await axios.post('http://localhost:5000/api/auth/google-register', registrationData);
      
      console.log('Google registration response:', response.data);
      
      // Clear temporary Google user data
      localStorage.removeItem('tempGoogleUser');
      
      // Handle Employee role with pending approval
      if (formData.role === 'Employee') {
        console.log('Employee Google registration detected');
        
        if (response.data.requiresApproval || response.data.message?.includes('pending') || response.data.user?.status === 'pending') {
          console.log('Employee needs approval, redirecting to pending page');
          
          const pendingUser = {
            id: response.data.user?.id || response.data.user?._id || 'temp-id-' + Date.now(),
            _id: response.data.user?.id || response.data.user?._id || 'temp-id-' + Date.now(),
            username: formData.username,
            name: googleUserData.name,
            email: googleUserData.email,
            phone: formData.phone,
            address: formData.address,
            role: formData.role,
            status: 'pending',
            createdAt: new Date().toISOString(),
            isGoogleUser: true
          };
          
          localStorage.setItem('user', JSON.stringify(pendingUser));
          
          if (response.data.token) {
            localStorage.setItem('token', response.data.token);
          }
          
          navigate('/employee-pending');
          return;
        } else {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          navigate('/employee');
        }
      } else {
        // Auto-login for non-employee roles
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        if (response.data.user.role === "Administrator") {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
      
    } catch (err) {
      console.error('Google signup completion error:', err);
      setError(err.response?.data?.message || 'Registration completion failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!googleUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <button
          onClick={() => navigate('/signup')}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-400 transition duration-300 mb-4"
        >
          ← Back to Signup
        </button>

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Complete Your Registration</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome, {googleUserData.name}! Please provide additional details to complete your account setup.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Google User Info Display */}
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">
                <strong>Google Account Connected:</strong><br/>
                Name: {googleUserData.name}<br/>
                Email: {googleUserData.email}
              </p>
            </div>
          </div>
        </div>

        {/* Employee Registration Notice */}
        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">
                <strong>Employee Registration:</strong> If you're registering as an Employee, your account will need administrator approval before you can access the employee dashboard.
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter a unique username"
                value={formData.username}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="">Select Role</option>
                <option value="Employee">Employee</option>
                <option value="User">User</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                required
                rows="3"
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter your full address"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Completing Registration...
                </span>
              ) : (
                'Complete Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoogleSignupCompletion;