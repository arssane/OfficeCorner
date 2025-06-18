import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleSignupForm, setShowGoogleSignupForm] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [googleSignupData, setGoogleSignupData] = useState({
    username: '',
    phone: '',
    address: '',
    role: ''
  });

  // New state for OTP flow (similar to LoginForm.jsx)
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false); // Renamed from isVerifyingOtp for clarity when sending
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false); // New state for verifying OTP
  const [otpError, setOtpError] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0); // Timer for OTP resend

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

  // OTP Resend Timer Effect (from LoginForm.jsx)
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
        client_id: '208707733113-2s3kivojij1t7sotgj3bsu38sf62ofhf.apps.googleusercontent.com',
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      
      window.google.accounts.id.renderButton(
        document.getElementById('google-signup-button'),
        { 
          theme: 'outline', 
          size: 'large',
          width: '100%',
          text: 'sign_up_with_google'
        }
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    // Check all fields are filled
    if (!formData.username || !formData.name || !formData.email || !formData.password || 
        !formData.confirmPassword || !formData.role || !formData.phone || !formData.address) {
      setError('Please complete all required fields');
      return false;
    }

    // Validate email
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Check password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    // Check passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Prevent Administrator role selection
    if (formData.role === 'Administrator') {
      setError('Administrator accounts cannot be created through registration. Please contact your system administrator.');
      return false;
    }

    return true;
  };

  const handleSendOtp = async () => {
    setError('');
    setOtpError('');
    if (!formData.email) {
      setOtpError('Please enter your email to send OTP.');
      return;
    }
    
    setIsSendingOtp(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/send-otp', { 
        email: formData.email, 
        purpose: 'signup-verification' // Define a purpose for signup OTP
      });
      
      if (response.data.success) {
        setOtpSent(true);
        setOtpResendTimer(60); // Start 60-second timer
        setOtpError('OTP sent to your email. Please check your inbox.');
      } else {
        setOtpError(response.data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setOtpError(err.response?.data?.message || 'Error sending OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpAndRegister = async () => {
    setOtpError('');
    if (!otpInput) {
      setOtpError('Please enter the OTP you received.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      // First verify OTP
      const verifyResponse = await axios.post('http://localhost:5000/api/auth/verify-otp', {
        email: formData.email,
        otp: otpInput,
        purpose: 'signup-verification'
      });

      if (verifyResponse.data.success) {
        setOtpError('OTP verified successfully!');
        // Proceed with registration if OTP is verified
        const { confirmPassword, ...dataToSend } = formData;
        dataToSend.otp = otpInput; // Include OTP in the registration data

        console.log('Sending registration data with OTP:', dataToSend);
        const response = await axios.post('http://localhost:5000/api/auth/register', dataToSend);
        console.log('Registration response:', response.data);
        
        if (formData.role === 'Employee') {
          if (response.data.requiresApproval || response.data.message?.includes('pending') || response.data.user?.status === 'pending') {
            const pendingUser = {
              id: response.data.user?.id || response.data.user?._id || 'temp-id-' + Date.now(),
              _id: response.data.user?.id || response.data.user?._id || 'temp-id-' + Date.now(),
              username: formData.username,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              address: formData.address,
              role: formData.role,
              status: 'pending',
              createdAt: new Date().toISOString()
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
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          if (response.data.user.role === "Administrator") {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        setOtpError(verifyResponse.data.message || 'OTP verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying OTP or during signup:', err);
      setOtpError(err.response?.data?.message || 'OTP verification or registration failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
      setIsLoading(false); // Ensure main loading is also off
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    if (!otpSent) {
      // If OTP hasn't been sent yet, send it
      await handleSendOtp();
    } else {
      // If OTP has been sent, verify it and then register
      await handleVerifyOtpAndRegister();
    }
  };

  const handleGoogleResponse = async (response) => {
    if (!response.credential) {
      setError('Google Sign-Up failed. Please try again.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      setGoogleToken(response.credential);
      
      const checkResponse = await axios.post('http://localhost:5000/api/auth/google-check', {
        token: response.credential
      });
      
      if (checkResponse.data.exists) {
        setError('An account with this Google account already exists. Please use the login page instead.');
        setIsLoading(false);
        return;
      }
      
      setGoogleUserInfo(checkResponse.data.userInfo);
      setGoogleSignupData({
        ...googleSignupData,
        username: checkResponse.data.userInfo.email.split('@')[0],
      });
      setShowGoogleSignupForm(true);
    } catch (err) {
      console.error('Google check error:', err);
      setError('Failed to verify Google account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignupChange = (e) => {
    setGoogleSignupData({
      ...googleSignupData,
      [e.target.name]: e.target.value
    });
  };

  // OTP functions for Google signup flow (from LoginForm.jsx, adapted)
  const handleSendOtpForGoogleSignup = async () => {
    if (!googleUserInfo?.email) {
      setOtpError('No email found for OTP. Please try Google Sign-In again.');
      return;
    }

    setOtpSent(false); // Reset this for Google flow
    setOtpError('');
    setIsSendingOtp(true); // Use this for sending OTP state
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/send-otp', { 
        email: googleUserInfo.email, 
        purpose: 'google-signup-verification' // New purpose for Google signup
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
      setIsSendingOtp(false);
    }
  };

  const handleGoogleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOtpError(''); // Clear OTP specific error
    
    if (!googleToken) {
      setError('Google authentication session expired. Please try signing in with Google again.');
      setShowGoogleSignupForm(false);
      return;
    }
    
    if (!googleSignupData.username || !googleSignupData.phone || 
        !googleSignupData.address || !googleSignupData.role) {
      setError('Please complete all required fields');
      return;
    }
    
    if (googleSignupData.role === 'Administrator') {
      setError('Administrator accounts cannot be created through Google Sign-up.');
      return;
    }

    // Ensure OTP is sent and entered for Google signup
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
      token: googleToken, 
      username: googleSignupData.username,
      email: googleUserInfo.email,
      name: googleUserInfo.name,
      phone: googleSignupData.phone,
      address: googleSignupData.address,
      role: googleSignupData.role,
      googleId: googleUserInfo.sub,
      profilePicture: googleUserInfo.picture,
      otp: otpInput, // Include OTP in the signup request for Google
      purpose: 'google-signup-verification' // Ensure purpose is sent for backend OTP validation
    };
    
    console.log('Sending Google signup request:', requestData);
    
    try {
      const signupResponse = await axios.post('http://localhost:5000/api/auth/google-signup', requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const completeUserData = {
        id: signupResponse.data.user?.id || signupResponse.data.user?._id || 'temp-google-' + Date.now(),
        _id: signupResponse.data.user?._id || signupResponse.data.user?.id || 'temp-google-' + Date.now(),
        username: googleSignupData.username,
        name: googleUserInfo.name,
        email: googleUserInfo.email,
        phone: googleSignupData.phone,
        address: googleSignupData.address,
        role: googleSignupData.role,
        status: 'pending', 
        department: 'General', // Default, adjust if needed
        position: 'Staff', // Default, adjust if needed
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
      
      navigate('/employee-pending');
      
    } catch (err) {
      console.error('Google signup error details:', err);
      
      if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Invalid signup data provided.';
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

  if (showGoogleSignupForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <button
            onClick={() => setShowGoogleSignupForm(false)}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-400 transition duration-300 mb-4"
          >
            ← Back
          </button>

          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Complete Your Google Registration</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Welcome {googleUserInfo?.name}! Please provide additional information and verify your email to complete your account.
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
                  <strong>Employee Registration:</strong> If you're registering as an Employee, your account will need administrator approval.
                </p>
              </div>
            </div>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleGoogleSignupSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={googleUserInfo?.email || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 sm:text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={googleUserInfo?.name || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700"> Username <span className="text-red-500">*</span> </label>
                <input id="username" name="username" type="text" required className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="Username" value={googleSignupData.username} onChange={handleGoogleSignupChange} />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700"> Role <span className="text-red-500">*</span> </label>
                <select id="role" name="role" required className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" value={googleSignupData.role} onChange={handleGoogleSignupChange} >
                  <option value="">Select Role</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700"> Phone Number <span className="text-red-500">*</span> </label>
                <input id="phone" name="phone" type="text" required className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="Phone Number" value={googleSignupData.phone} onChange={handleGoogleSignupChange} />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700"> Address <span className="text-red-500">*</span> </label>
                <input id="address" name="address" type="text" required className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="Address" value={googleSignupData.address} onChange={handleGoogleSignupChange} />
              </div>

              {/* OTP Section for Google Signup */}
              <div className="col-span-2">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700"> OTP <span className="text-red-500">*</span> </label>
                <div className="mt-1 flex space-x-2">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    className="flex-grow appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Enter OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    disabled={isSendingOtp}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtpForGoogleSignup}
                    disabled={isSendingOtp || otpResendTimer > 0}
                    className="flex-shrink-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingOtp ? (
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      `Send OTP ${otpResendTimer > 0 ? `(${otpResendTimer}s)` : ''}`
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || isVerifyingOtp || isSendingOtp}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading || isVerifyingOtp ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isVerifyingOtp ? 'Verifying OTP...' : 'Processing...'}
                  </span>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </div>

            <div className="text-sm text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign up for an account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
              sign in to your existing account
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
                <strong>Employee Registration:</strong> If you're registering as an Employee, your account will need administrator approval.
              </p>
            </div>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={otpSent} // Disable input if OTP is sent
                />
              </div>
              <div>
                <label htmlFor="name" className="sr-only">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={otpSent}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={otpSent}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={otpSent}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={otpSent}
                />
              </div>
              <div>
                <label htmlFor="phone" className="sr-only">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  autoComplete="tel"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={otpSent}
                />
              </div>
              <div>
                <label htmlFor="address" className="sr-only">Address</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  autoComplete="street-address"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={otpSent}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="role" className="sr-only">Role</label>
                <select
                  id="role"
                  name="role"
                  autoComplete="organization-role"
                  required
                  className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  value={formData.role}
                  onChange={handleInputChange}
                  disabled={otpSent}
                >
                  <option value="">Select Role</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>

              {/* OTP Input Field and Button */}
              {otpSent && (
                <div className="sm:col-span-2">
                  <label htmlFor="otp-input" className="sr-only">OTP</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      id="otp-input"
                      name="otpInput"
                      type="text"
                      required
                      className="flex-grow appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      placeholder="Enter OTP"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      disabled={isVerifyingOtp}
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || otpResendTimer > 0}
                      className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingOtp ? (
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        `Resend OTP ${otpResendTimer > 0 ? `(${otpResendTimer}s)` : ''}`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isSendingOtp || isVerifyingOtp}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {isLoading || isSendingOtp || isVerifyingOtp ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isSendingOtp ? 'Sending OTP...' : isVerifyingOtp ? 'Verifying OTP...' : 'Processing...'}
                </span>
              ) : (
                otpSent ? 'Verify OTP & Sign Up' : 'Sign up'
              )}
            </button>
          </div>

          <div className="text-sm text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>

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
            <div id="google-signup-button" className="w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;