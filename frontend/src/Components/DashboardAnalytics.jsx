import React, { useState, useEffect } from 'react';

const DashboardAnalytics = ({ authToken }) => {
  const [analyticsData, setAnalyticsData] = useState({
    employees: 0,
    tasksCompleted: 0,
    pendingEmployee: 0,
    upcomingEvents: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Mock data for testing
  const mockAnalyticsData = {
    employees: 45,
    tasksCompleted: 128,
    pendingEmployee: 23,
    upcomingEvents: 8
  };

  // Function to fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Use passed token prop or try to get from storage
      let token = authToken;
      
      if (!token) {
        token = getAuthToken();
      }
      
      // For testing purposes, if no token found, try a hardcoded one
      if (!token) {
        // You can temporarily hardcode your token here for testing
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Replace with your actual token from the screenshot
        console.log('Using fallback token for testing');
      }
      
      if (!token) {
        console.log('No authentication token found, using mock data');
        setAnalyticsData(mockAnalyticsData);
        setIsLoading(false);
        return;
      }
      
      console.log('Fetching analytics data...');
      
      // Make sure to use the correct API base URL
      const baseURL = 'http://localhost:5000';
      const response = await fetch(`${baseURL}/api/analytics/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response (likely HTML error page)');
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed - please login again');
        } else if (response.status === 403) {
          throw new Error('Access denied - insufficient permissions');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      console.log('Analytics data received:', responseData);
      
      // Handle the nested response structure from your backend
      if (responseData && responseData.success && responseData.data) {
        const data = responseData.data;
        setAnalyticsData({
          employees: data.employees || 0,
          tasksCompleted: data.tasksCompleted || 0,
          pendingEmployee: data.pendingEmployees || 0,
          upcomingEvents: data.upcomingEvents || 0
        });
      } else {
        throw new Error('Invalid data structure received from server');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setErrorMessage(`API Error: ${error.message}`);
      setIsLoading(false);
      // Fallback to mock data
      setAnalyticsData(mockAnalyticsData);
    }
  };

  // Alternative auth token retrieval methods
  const getAuthToken = () => {
    // Method 1: Try localStorage first (for your actual app)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('token');
      }
    } catch (error) {
      console.log('localStorage not available:', error);
    }
    
    // Method 2: Try sessionStorage as fallback
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem('token');
      }
    } catch (error) {
      console.log('sessionStorage not available:', error);
    }
    
    return null;
  };

  const refreshDashboardData = () => {
    fetchAnalyticsData();
  };

  useEffect(() => {
    fetchAnalyticsData();
    
    // // Set up auto-refresh every 60 seconds
    // const interval = setInterval(fetchAnalyticsData);
    
    // return () => clearInterval(interval);
  }, [authToken]); // Add authToken as dependency

  // Compact Analytics Cards Component
  const renderAnalyticsCards = () => {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Employee Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Employees</p>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-8 mt-1"></div>
                </div>
              ) : (
                <p className="text-lg font-bold text-gray-800">{analyticsData.employees}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Tasks Completed Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Completed Tasks</p>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-8 mt-1"></div>
                </div>
              ) : (
                <p className="text-lg font-bold text-gray-800">{analyticsData.tasksCompleted}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Tasks In Progress Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pending Employee</p>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-8 mt-1"></div>
                </div>
              ) : (
                <p className="text-lg font-bold text-gray-800">{analyticsData.pendingEmployee}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Upcoming Events Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Events</p>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-8 mt-1"></div>
                </div>
              ) : (
                <p className="text-lg font-bold text-gray-800">{analyticsData.upcomingEvents}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytics Overview</h2>
          <p className="text-sm text-gray-600">Real-time dashboard metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshDashboardData}
            className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={isLoading}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Message - Compact */}
      {errorMessage && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md text-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L2.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="truncate">{errorMessage} (Using demo data)</span>
          </div>
        </div>
      )}

      {/* Analytics Cards */}
      {renderAnalyticsCards()}

      {/* Compact Status Indicator */}
      <div className="mt-3 flex items-center justify-center text-xs text-gray-500">
        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isLoading ? 'bg-yellow-500 animate-pulse' : errorMessage ? 'bg-red-500' : 'bg-green-500'}`}></div>
        {isLoading ? 'Updating...' : errorMessage ? 'Using demo data' : 'Live data'}
        <span className="ml-2">
          • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    </div>
  );
};

export default DashboardAnalytics;