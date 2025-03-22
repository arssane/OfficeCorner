// Frontend/src/components/SignupForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

const SignupForm = ({ onClose, onSignupSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    // Check all fields are filled
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || !formData.role) {
      setError('Please fill in all fields');
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

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...dataToSend } = formData;
      
      const response = await axios.post('http://localhost:5000/api/auth/register', dataToSend);
      
      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Call success handler if provided
      if (onSignupSuccess) {
        onSignupSuccess(response.data.user);
      }
      
      onClose();
    } catch (err) {
      console.error('Signup error:', err);
      setError(
        err.response?.data?.message || 
        'An error occurred during signup. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded shadow-md">
      <h2 className="text-3xl font-bold mb-4">Sign Up</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {/* <div className="mb-4">
          <label className="block text-left text-gray-700">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Enter your username"
            className="w-full px-4 py-2 border border-gray-300 rounded mt-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div> */}
        <div className="mb-4">
          <label className="block text-left text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            className="w-full px-4 py-2 border border-gray-300 rounded mt-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-left text-gray-700">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            className="w-full px-4 py-2 border border-gray-300 rounded mt-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
        </div>
        <div className="mb-4">
          <label className="block text-left text-gray-700">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirm your password"
            className="w-full px-4 py-2 border border-gray-300 rounded mt-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-left text-gray-700">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded mt-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          >
            <option value="">Select your role</option>
            <option value="Administrator">Administrator</option>
            <option value="Employee">Employee</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
            onClick={onClose}
            disabled={isLoading}
          >
            Close
          </button>
          <button
            type="submit"
            className={`ml-2 px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing up...
              </>
            ) : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SignupForm;