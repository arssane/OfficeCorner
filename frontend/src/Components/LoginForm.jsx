import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
// import useNotifications from '../hooks/useNotification'; // Removed due to resolution error

const LoginPage = () => {
  const navigate = useNavigate();
  // const { reconnectSocket } = useNotifications(); // Removed due to resolution error
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleSignupForm, setShowGoogleSignupForm] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState(null);
  const [currentGoogleToken, setCurrentGoogleToken] = useState(null);
  const [googleSignupData, setGoogleSignupData] = useState({
    username: '',
    phone: '',
    address: '',
    role: ''
  });

  // New state for Google OTP flow
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0); // Timer for OTP resend

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

  // OTP Resend Timer Effect
  useEffect(() => {
    let timerInterval;
    if (otpResendTimer > 0) {
      timerInterval = setInterval(() => {
        setOtpResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [otpResendTimer]);


  const initializeGoogleSignIn = () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: '208707733113-2s3kivojij1t7sotgj3bsu38sf62ofhf.apps.googleusercontent.com', // Replace with your actual client ID
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
      
       // Store token
      localStorage.setItem('token', response.data.token);

      const userData = response.data.user;
      
      // CRITICAL FIX: Store ALL user data consistently
      const completeUserData = {
        id: userData.id || userData._id,
        _id: userData._id || userData.id,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status || 'approved',
        department: userData.department || 'General',
        position: userData.position || 'Staff',
        phone: userData.phone || '',
        address: userData.address || '',
        createdAt: userData.createdAt || new Date().toISOString()
      };
      
      // Store complete user data
      localStorage.setItem('user', JSON.stringify(completeUserData));
      
      // Store individual fields that dashboard expects
      localStorage.setItem('employeeId', completeUserData.id);
      localStorage.setItem('employeeName', completeUserData.name);
      localStorage.setItem('employeeEmail', completeUserData.email);
      localStorage.setItem('employeeDepartment', completeUserData.department);
      localStorage.setItem('employeePosition', completeUserData.position);
      
      console.log('User logged in with complete data:', completeUserData);

      // Removed reconnectSocket call
      // setTimeout(() => {
      //   if (reconnectSocket) {
      //     reconnectSocket();
      //   }
      // }, 1000);

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
          
          // Removed reconnectSocket call
          // setTimeout(() => {
          //   if (reconnectSocket) {
          //     reconnectSocket();
          //   }
          // }, 1000);
          
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
  setCurrentGoogleToken(response.credential);

  setIsLoading(true);
  setError('');
  setOtpSent(false); // Reset OTP state for new Google flow
  setOtpInput('');
  setOtpError('');
  setOtpResendTimer(0);
  
  try {
    const checkResponse = await axios.post('http://localhost:5000/api/auth/google-check', {
      token: response.credential
    });
    
    if (checkResponse.data.exists) {
      console.log('Existing Google user found, signing in automatically...');
      
      try {
        const signinResponse = await axios.post('http://localhost:5000/api/auth/google-signin', {
          token: response.credential,
          role: 'Employee'
        });
        
        localStorage.setItem('token', signinResponse.data.token);
        
        // CRITICAL FIX: Store complete and consistent user data
        const userData = signinResponse.data.user;
        const completeUserData = {
          id: userData.id || userData._id,
          _id: userData._1id || userData.id,
          username: userData.username,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          status: userData.status || 'approved',
          department: userData.department || 'General',
          position: userData.position || 'Staff',
          phone: userData.phone || '',
          address: userData.address || '',
          createdAt: userData.createdAt || new Date().toISOString()
        };
        
        localStorage.setItem('user', JSON.stringify(completeUserData));
        
        // Store individual fields that dashboard expects
        localStorage.setItem('employeeId', completeUserData.id);
        localStorage.setItem('employeeName', completeUserData.name);
        localStorage.setItem('employeeEmail', completeUserData.email);
        localStorage.setItem('employeeDepartment', completeUserData.department);
        localStorage.setItem('employeePosition', completeUserData.position);
        
        console.log('Google user logged in with complete data:', completeUserData);

        // Removed reconnectSocket call
        // setTimeout(() => {
        //   if (reconnectSocket) {
        //     reconnectSocket();
        //   }
        // }, 1000);
        
        // Navigate based on user status
        if (completeUserData.status === 'pending') {
          navigate('/employee-pending');
        } else if (completeUserData.status === 'approved') {
          navigate('/employee');
        } else {
          navigate('/employee');
        }
        
      } catch (signinError) {
        // Handle pending users for Google sign-in
        if (signinError.response?.status === 403 && signinError.response?.data?.message?.includes('pending')) {
          try {
            const userLookupResponse = await axios.post('http://localhost:5000/api/auth/google-lookup', {
              token: response.credential
            });

            if (userLookupResponse.data.user) {
              const pendingUser = userLookupResponse.data.user;
              const completePendingUser = {
                id: pendingUser.id || pendingUser._id,
                _id: pendingUser._id || pendingUser.id,
                username: pendingUser.username,
                name: pendingUser.name,
                email: pendingUser.email,
                role: 'Employee',
                status: 'pending',
                department: pendingUser.department || 'General',
                position: pendingUser.position || 'Staff',
                phone: pendingUser.phone || '',
                address: pendingUser.address || '',
                createdAt: pendingUser.createdAt || new Date().toISOString()
              };
              localStorage.setItem('user', JSON.stringify(completePendingUser));
            }
          } catch (lookupError) {
            console.warn('Could not lookup Google user data:', lookupError);
          }
          
          // Removed reconnectSocket call
          // setTimeout(() => {
          //   if (reconnectSocket) {
          //     reconnectSocket();
          //   }
          // }, 1000);
          
          setError(signinError.response.data.message);
          setTimeout(() => {
            navigate('/employee-pending');
          }, 1000);
        } else {
          console.error('Google Sign-In error:', signinError);
          setError(signinError.response?.data?.message || 'Google authentication failed. Please try again.');
        }
      }
    } else {
      // User doesn't exist, redirect to signup
      console.log('New Google user, redirecting to signup...');
      setGoogleUserInfo(checkResponse.data.googleUserInfo);
      setGoogleSignupData({
        ...googleSignupData,
        username: checkResponse.data.googleUserInfo.email.split('@')[0],
        role: 'Employee'
      });
      setShowGoogleSignupForm(true);
    }
  } catch (err) {
    console.error('Google check error:', err);
    setError('Failed to verify Google account. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  const handleGoogleSignupChange = (e) => {
  // Prevent role changes - keep it as Employee
  if (e.target.name === 'role') {
    return;
  }
  
  setGoogleSignupData({
    ...googleSignupData,
    [e.target.name]: e.target.value
  });
};

  const handleSendOtpForGoogleSignup = async () => {
    if (!googleUserInfo?.email) {
      setOtpError('No email found for OTP. Please try Google Sign-In again.');
      return;
    }

    setOtpSent(false);
    setOtpError('');
    setIsVerifyingOtp(true); // Use this for sending OTP state
    
    try {
      // Sending OTP with a specific purpose for Google signup
      const response = await axios.post('http://localhost:5000/api/auth/send-otp', { 
        email: googleUserInfo.email, 
        purpose: 'google-signup-verification' // New purpose
      });
      
      if (response.data.success) {
        setOtpSent(true);
        setOtpResendTimer(60); // Start 60-second timer
        setError(''); // Clear main form error
        setOtpError('OTP sent to your Google email. Please check your inbox.');
      } else {
        setOtpError(response.data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      console.error('Error sending OTP for Google signup:', err);
      setOtpError(err.response?.data?.message || 'Error sending OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleGoogleSignupSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setOtpError(''); // Clear OTP specific error
  
  if (!currentGoogleToken) {
    setError('Google authentication session expired. Please try signing in with Google again.');
    setShowGoogleSignupForm(false);
    return;
  }
  
  if (!googleSignupData.username || !googleSignupData.phone || !googleSignupData.address) {
    setError('Please complete all required fields');
    return;
  }

  // Ensure OTP is sent and entered
  if (!otpSent) {
    setError('Please send and verify the OTP to complete registration.');
    return;
  }

  if (!otpInput) {
    setOtpError('Please enter the OTP you received.');
    return;
  }
  
  setIsLoading(true);
  
  const requestData = {
    token: currentGoogleToken,
    role: 'Employee', // Role is forced to Employee
    username: googleSignupData.username,
    phone: googleSignupData.phone,
    address: googleSignupData.address,
    otp: otpInput, // Include OTP in the signup request
    email: googleUserInfo.email // Also send email for backend OTP verification
  };
  
  console.log('Sending Google signup request:', requestData);
  
  try {
    const signupResponse = await axios.post('http://localhost:5000/api/auth/google-signup', requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // CRITICAL FIX: Create complete user data structure
    const completeUserData = {
      id: signupResponse.data.user?.id || signupResponse.data.user?._id || 'temp-google-' + Date.now(),
      _id: signupResponse.data.user?._id || signupResponse.data.user?.id || 'temp-google-' + Date.now(),
      username: googleSignupData.username,
      name: googleUserInfo.name,
      email: googleUserInfo.email,
      phone: googleSignupData.phone,
      address: googleSignupData.address,
      role: 'Employee',
      status: 'pending', // Employee accounts are always pending
      department: 'General',
      position: 'Staff',
      createdAt: signupResponse.data.user?.createdAt || new Date().toISOString()
    };
    
    localStorage.setItem('user', JSON.stringify(completeUserData));
    
    // Store individual fields that dashboard expects
    localStorage.setItem('employeeId', completeUserData.id);
    localStorage.setItem('employeeName', completeUserData.name);
    localStorage.setItem('employeeEmail', completeUserData.email);
    localStorage.setItem('employeeDepartment', completeUserData.department);
    localStorage.setItem('employeePosition', completeUserData.position);
    
    if (signupResponse.data.token) {
      localStorage.setItem('token', signupResponse.data.token);
    }
    
    console.log('Google signup completed with data:', completeUserData);
    
    // Removed reconnectSocket call
    // setTimeout(() => {
    //   if (reconnectSocket) {
    //     reconnectSocket();
    //   }
    // }, 1000);
    
    navigate('/employee-pending');
    
  } catch (err) {
    console.error('Google signup error details:', err);
    
    if (err.response?.status === 400) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Invalid signup data provided.';
      // Check if the error is OTP related
      if (errorMsg.includes('OTP')) {
        setOtpError(errorMsg);
      } else {
        setError(`Signup failed: ${errorMsg}`);
      }
    } else {
      setError(err.response?.data?.message || 'Google sign-up failed. Please try again.');
    }
  } finally {
    setIsLoading(false);
  }
};

  const handleGoogleSignInWithRole = async () => {
    // This function seems unused or commented out in your original code.
    // Keeping it as is, but it might be deprecated.
    if (!currentGoogleToken) {
      setError('Google token is missing. Please try again.');
      return;
    }
    
    // This entire block might be removed if you unify sign-in flow through handleGoogleResponse
    // For now, I'll keep it as is, assuming 'roleForGoogle' is a state variable not in this snippet
    const roleForGoogle = 'Employee'; // Assuming a default or selected role
    
    if (roleForGoogle === 'Administrator') {
      setError('Administrator accounts cannot be accessed through Google Sign-in. Please use the regular login form.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const endpoint = 'http://localhost:5000/api/auth/google-signin'; // Unified endpoint
        
      const response = await axios.post(endpoint, {
        token: currentGoogleToken,
        role: roleForGoogle
      });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('Google user logged in:', response.data.user);

      // Removed reconnectSocket call
      // setTimeout(() => {
      //   if (reconnectSocket) {
      //     reconnectSocket();
      //   }
      // }, 1000);
      
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
            token: currentGoogleToken,
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
        
        // Removed reconnectSocket call
        // setTimeout(() => {
        //   if (reconnectSocket) {
        //     reconnectSocket();
        //   }
        // }, 1000);
        
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

  if (showGoogleSignupForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Complete Your Registration</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Welcome {googleUserInfo?.name}! Please provide additional information and verify your email to complete your account setup.
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
          {otpError && (
            <div className="bg-orange-50 border-l-4 border-orange-500 text-orange-700 p-4 mb-6 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.375a.75.75 0 011.486 0l3.052 6.551a.75.75 0 01-.158.749 1.5 1.5 0 01-1.246.625H5.074a1.5 1.5 0 01-1.246-.625.75.75 0 01-.158-.749l3.052-6.551zM10 7a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5A.75.75 0 0110 7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{otpError}</p>
                </div>
              </div>
            </div>
          )}

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
                  <strong>Employee Registration:</strong> Your account will need administrator approval after successful email verification.
                </p>
              </div>
            </div>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleGoogleSignupSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={googleUserInfo?.email || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={googleUserInfo?.name || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Choose a username"
                  value={googleSignupData.username}
                  onChange={handleGoogleSignupChange}
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
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                  value={googleSignupData.role}
                  onChange={handleGoogleSignupChange}
                  disabled // Role is fixed for Google signup
                >
                  <option value="Employee">Employee</option>
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Your phone number"
                  value={googleSignupData.phone}
                  onChange={handleGoogleSignupChange}
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Your address"
                  value={googleSignupData.address}
                  onChange={handleGoogleSignupChange}
                />
              </div>

              {/* OTP Section for Google Signup */}
              <div className="pt-4 border-t border-gray-200">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Email Verification Code <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex space-x-2">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Enter 6-digit OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtpForGoogleSignup}
                    disabled={isVerifyingOtp || otpResendTimer > 0}
                    className="flex-shrink-0 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingOtp ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      otpResendTimer > 0 ? `Resend (${otpResendTimer}s)` : 'Send OTP'
                    )}
                  </button>
                </div>
                {otpSent && <p className="mt-2 text-xs text-gray-500">OTP sent to {googleUserInfo?.email}.</p>}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setShowGoogleSignupForm(false)}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !otpSent || !otpInput}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </div>
                ) : 'Complete Registration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <button
          onClick={() => navigate('/')}
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
                {/* <option value="User">User</option> */}
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