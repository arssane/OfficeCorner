import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import useNotifications from '../hooks/useNotification';

const LoginPage = () => {
  const navigate = useNavigate();
  const { reconnectSocket } = useNotifications();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roleForGoogle, setRoleForGoogle] = useState('');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [googleToken, setGoogleToken] = useState(null);

  // Load the Google API script
  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      
      script.onload = initializeGoogleSignIn;
    };

    loadGoogleScript();
    
    return () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  const initializeGoogleSignIn = () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: '208707733113-2s3kivojij1t7sotgj3bsu38sf62ofhf.apps.googleusercontent.com',
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { 
          theme: 'outline', 
          size: 'large',
          width: '100%',
          text: 'sign_in_with_google'
        }
      );
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    if (e.target.name === 'role' && showRoleSelector) {
      setRoleForGoogle(e.target.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!formData.email || !formData.password || !formData.role) {
      setError('Please complete all required fields');
      setIsLoading(false);
      return;
    }
    
    try {
      const endpoint = 'http://localhost:5000/api/auth/login';
      const response = await axios.post(endpoint, formData);
      
      localStorage.setItem('token', response.data.token);

      const userData = response.data.user;
      localStorage.setItem('employeeId', userData.id || userData._id);
      localStorage.setItem('employeeName', userData.name);
      localStorage.setItem('employeeEmail', userData.email);
      localStorage.setItem('employeeDepartment', userData.department || 'General');
      localStorage.setItem('employeePosition', userData.position || 'Staff');
      
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('User logged in:', response.data.user);

      setTimeout(() => {
        if (reconnectSocket) {
          reconnectSocket();
        }
      }, 1000);

      if (response.data.user.role === "Administrator") {
        navigate('/admin');
      } else if (response.data.user.role === 'Employee') {
        if (response.data.user.status === 'pending') {
          navigate('/employee-pending');
        } else if (response.data.user.status === 'approved') {
          navigate('/employee');
        } else if (response.data.user.status === 'rejected') {
          navigate('/employee-pending');
        } else {
          navigate('/employee-pending');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        const errorMessage = err.response.data.message || '';
        
        if (errorMessage.includes('pending approval') || 
            errorMessage.includes('pending') || 
            err.response.data.redirect === '/employee-pending') {
          
          // CRITICAL FIX: Try to get real user data from server for pending users
          try {
            // Make a request to get the actual user data for pending users
            const userLookupResponse = await axios.post('http://localhost:5000/api/auth/lookup-user', {
              email: formData.email,
              role: formData.role
            }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (userLookupResponse.data.user) {
              // Use the real user data from server
              const pendingUser = userLookupResponse.data.user;
              console.log('Found pending user data from server:', pendingUser);
              localStorage.setItem('user', JSON.stringify(pendingUser));
            } else {
              throw new Error('User not found');
            }
          } catch (lookupError) {
            console.warn('Could not lookup user data, using fallback:', lookupError);
            // Fallback: Create user object with meaningful data but flag it as temporary
            const pendingUser = {
              id: 'temp-id-' + Date.now(),
              _id: 'temp-id-' + Date.now(),
              username: formData.email.split('@')[0],
              name: formData.email.split('@')[0],
              email: formData.email,
              role: formData.role,
              status: 'pending',
              createdAt: new Date().toISOString(),
              isTemporary: true // Flag to indicate this needs to be refreshed
            };
            localStorage.setItem('user', JSON.stringify(pendingUser));
          }
          
          setTimeout(() => {
            if (reconnectSocket) {
              reconnectSocket();
            }
          }, 1000);
          
          setError(errorMessage);
          
          setTimeout(() => {
            navigate('/employee-pending');
          }, 1000);
        } else if (err.response.data.redirect) {
          setError(errorMessage);
          setTimeout(() => {
            navigate(err.response.data.redirect);
          }, 3000);
        } else {
          setError(errorMessage || 'Access forbidden. Please check your credentials.');
        }
      } else {
        console.error('Login error:', err);
        setError(
          err.response?.data?.message || 
          'Authentication failed. Please verify your credentials and try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleResponse = async (response) => {
    if (!response.credential) {
      setError('Google Sign-In failed. Please try again.');
      return;
    }
    
    setGoogleToken(response.credential);
    setShowRoleSelector(true);
  };

  const handleGoogleSignInWithRole = async () => {
    if (!googleToken || !roleForGoogle) {
      setError('Please select a role to continue');
      return;
    }
    
    if (roleForGoogle === 'Administrator') {
      setError('Administrator accounts cannot be accessed through Google Sign-in. Please use the regular login form.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const endpoint = roleForGoogle === 'Employee'
        ? 'http://localhost:5000/api/employee/google'
        : 'http://localhost:5000/api/auth/google';
        
      const response = await axios.post(endpoint, {
        token: googleToken,
        role: roleForGoogle
      });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('Google user logged in:', response.data.user);

      setTimeout(() => {
        if (reconnectSocket) {
          reconnectSocket();
        }
      }, 1000);
      
      if (response.data.user.role === "Administrator") {
        navigate('/admin');
      }
      else if (response.data.user.role === 'Employee'){
        if (response.data.user.status === 'pending') {
          navigate('/employee-pending');
        } else if (response.data.user.status === 'approved') {
          navigate('/employee');
        } else {
          navigate('/employee-pending');
        }
      }
      else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.message?.includes('pending')) {
        // Try to get real user data for Google sign-in pending users too
        try {
          const userLookupResponse = await axios.post('http://localhost:5000/api/auth/google-lookup', {
            token: googleToken,
            role: roleForGoogle
          });

          if (userLookupResponse.data.user) {
            const pendingUser = userLookupResponse.data.user;
            localStorage.setItem('user', JSON.stringify(pendingUser));
          } else {
            throw new Error('Google user not found');
          }
        } catch (lookupError) {
          console.warn('Could not lookup Google user data:', lookupError);
          const pendingUser = {
            id: 'temp-google-' + Date.now(),
            _id: 'temp-google-' + Date.now(),
            username: 'google-user-' + Date.now(),
            name: 'Google User',
            email: '',
            role: roleForGoogle,
            status: 'pending',
            createdAt: new Date().toISOString(),
            isTemporary: true
          };
          localStorage.setItem('user', JSON.stringify(pendingUser));
        }
        
        setTimeout(() => {
          if (reconnectSocket) {
            reconnectSocket();
          }
        }, 1000);
        
        setError(err.response.data.message);
        setTimeout(() => {
          navigate('/employee-pending');
        }, 1000);
      } else {
        console.error('Google Sign-In error:', err);
        setError(
          err.response?.data?.message || 
          'Google authentication failed. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showRoleSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Select Your Role</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please select your role to complete sign-in with Google
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

          <div className="space-y-6">
            <div>
              <label htmlFor="roleForGoogle" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                id="roleForGoogle"
                name="roleForGoogle"
                value={roleForGoogle}
                onChange={(e) => setRoleForGoogle(e.target.value)}
                required
              >
                <option value="">Select your role</option>
                <option value="Employee">Employee</option>
                <option value="User">User</option>
              </select>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowRoleSelector(false)}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Back
              </button>
              <button
                onClick={handleGoogleSignInWithRole}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading || !roleForGoogle}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-400 transition duration-300 mb-4"
        >
          ← Back
        </button>

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/signup" className="font-medium text-green-600 hover:text-green-500">
              create a new account
            </Link>
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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="">Select your role</option>
                <option value="Administrator">Administrator</option>
                <option value="Employee">Employee</option>
                <option value="User">User</option>
              </select>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password" 
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
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
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : 'Sign in'}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <div id="google-signin-button" className="w-full"></div>
            </div>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-green-600 hover:text-green-500">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;