import React, { useState, useEffect } from 'react';
import { User, Mail, Briefcase, MapPin, Phone, Calendar, Loader2, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const MyProfile = () => {
  const navigate = useNavigate();
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get API configuration from localStorage
  const getApiBaseUrl = () => {
    return localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
  };

  // Check authentication status
  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      console.log('No authentication found, redirecting to login');
      navigate('/login');
      return false;
    }

    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser.status === 'pending') {
        console.log('User status is pending, redirecting to pending page');
        navigate('/employee-pending');
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
      navigate('/login');
      return false;
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Fetch employee profile details
  const fetchEmployeeProfile = async () => {
    if (!checkAuthStatus()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const baseUrl = getApiBaseUrl();
      const storedProfileEndpoint = localStorage.getItem("profileEndpoint");

      const possibleEndpoints = storedProfileEndpoint ? 
        [storedProfileEndpoint] : 
        [
          `${baseUrl}/auth/profile`,
          `${baseUrl}/user/profile`,
          `${baseUrl}/employee/profile`,
          `${baseUrl}/auth/me`,
          `${baseUrl}/me`
        ];

      let success = false;
      let fetchedUserData = null;
      let successfulEndpoint = '';

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying profile endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            timeout: 10000
          });

          if (response.status >= 200 && response.status < 300 && response.data) {
            fetchedUserData = response.data.user || response.data;
            success = true;
            successfulEndpoint = endpoint;
            break;
          }
        } catch (error) {
          console.warn(`Failed with profile endpoint ${endpoint}:`, error.message);
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            console.error("Unauthorized: Token invalid or expired");
            handleLogout();
            return;
          }
        }
      }

      if (success && fetchedUserData) {
        if (fetchedUserData.status === 'pending') {
          navigate('/employee-pending');
          return;
        }

        const employeeData = {
          id: fetchedUserData.id || fetchedUserData._id || 'N/A',
          name: (fetchedUserData.name && fetchedUserData.name !== 'Employee') ? fetchedUserData.name : (fetchedUserData.username || 'Employee Name'),
          email: fetchedUserData.email || 'N/A',
          username: fetchedUserData.username || 'N/A',
          department: fetchedUserData.department || 'General',
          position: fetchedUserData.position || 'Staff',
          phone: fetchedUserData.phone || 'N/A',
          address: fetchedUserData.address || 'N/A',
          status: fetchedUserData.status || 'approved',
          createdAt: fetchedUserData.createdAt ? new Date(fetchedUserData.createdAt).toLocaleDateString() : 'N/A',
        };
        setEmployeeProfile(employeeData);
        localStorage.setItem('user', JSON.stringify(fetchedUserData)); // Update localStorage
        localStorage.setItem("profileEndpoint", successfulEndpoint); // Store successful endpoint
        setError(null);
      } else {
        setError("Failed to fetch profile information. Please try again.");
        handleLogout();
      }
    } catch (err) {
      console.error("Error fetching employee profile:", err);
      setError("An error occurred while fetching your profile. Please try again.");
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 flex justify-center items-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="flex items-center text-xl text-green-700">
            <Loader2 className="animate-spin mr-3" size={28} />
            <span className="font-medium">Loading your profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-red-50 to-rose-100 flex justify-center items-center p-6">
        <div className="bg-white/90 backdrop-blur-sm border border-red-200 text-red-700 px-8 py-6 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="text-red-600" size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2">Error:</h3>
          <p className="mb-6 text-red-600">{error}</p>
          <div className="space-y-3">
            <button
              onClick={fetchEmployeeProfile}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Retry
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-100 text-gray-800 px-6 py-3 rounded-xl hover:bg-gray-200 transition-all duration-300"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!employeeProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-amber-100 flex justify-center items-center p-6">
        <div className="bg-white/90 backdrop-blur-sm border border-yellow-200 text-yellow-700 px-8 py-6 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-yellow-600" size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2">Information:</h3>
          <p className="mb-6 text-yellow-600">No profile data available.</p>
          <button
            onClick={fetchEmployeeProfile}
            className="w-full bg-yellow-600 text-white px-6 py-3 rounded-xl hover:bg-yellow-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Try Fetching Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 p-6 sm:p-10">
        {/* Header */}
        <header className="max-w-6xl mx-auto mb-8">
          <div className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-3xl p-6 border border-white/20">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                My Profile
              </h1>
              <button
                onClick={() => navigate('/employee')}
                className="group bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* Profile Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-6xl font-bold shadow-2xl ring-4 ring-white/30">
                    {employeeProfile.name ? employeeProfile.name[0].toUpperCase() : 'E'}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent animate-pulse"></div>
                </div>
                <h2 className="text-4xl font-bold mb-2">{employeeProfile.name}</h2>
                <p className="text-xl text-white/90 mb-4">{employeeProfile.position}</p>
                <div className="text-lg text-white/80">{employeeProfile.department}</div>
                <div className={`mt-4 px-6 py-2 rounded-full text-sm font-semibold backdrop-blur-sm ${
                  employeeProfile.status === 'approved' ? 'bg-green-500/20 text-green-100 ring-1 ring-green-400/30' :
                  employeeProfile.status === 'pending' ? 'bg-yellow-500/20 text-yellow-100 ring-1 ring-yellow-400/30' :
                  'bg-gray-500/20 text-gray-100 ring-1 ring-gray-400/30'
                }`}>
                  Status: {employeeProfile.status.charAt(0).toUpperCase() + employeeProfile.status.slice(1)}
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { icon: User, label: 'Username', value: employeeProfile.username, color: 'green' },
                  { icon: Mail, label: 'Email Address', value: employeeProfile.email, color: 'emerald' },
                  { icon: Phone, label: 'Phone Number', value: employeeProfile.phone, color: 'teal' },
                  { icon: MapPin, label: 'Address', value: employeeProfile.address, color: 'green' },
                  { icon: Briefcase, label: 'Employee ID', value: employeeProfile.id, color: 'emerald' },
                  { icon: Calendar, label: 'Member Since', value: employeeProfile.createdAt, color: 'teal' },
                ].map(({ icon: Icon, label, value, color }, index) => (
                  <div
                    key={label}
                    className="group p-6 bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-2xl shadow-lg border border-green-200/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${
                        color === 'green' ? 'from-green-500 to-green-600' :
                        color === 'emerald' ? 'from-emerald-500 to-emerald-600' :
                        'from-teal-500 to-teal-600'
                      } rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="text-white" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${
                          color === 'green' ? 'text-green-700' :
                          color === 'emerald' ? 'text-emerald-700' :
                          'text-teal-700'
                        } mb-1`}>{label}</p>
                        <p className="text-lg text-gray-800 break-words">{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logout Button */}
            <div className="p-8 pt-0">
              <div className="flex justify-end">
                <button
                  onClick={handleLogout}
                  className="group bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-3 text-lg font-medium"
                >
                  <LogOut size={24} className="group-hover:rotate-12 transition-transform duration-300" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;