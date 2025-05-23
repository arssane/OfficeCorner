// hooks/useNotifications.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import axios from 'axios';

const useNotifications = () => {
  const socketRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    userRef.current = user;
    
    // Only initialize socket for logged-in users
    if (!user.id && !user._id) {
      console.log('❌ No user ID found, skipping socket connection');
      return;
    }

    const userId = user.id || user._id;
    console.log('🔌 Initializing socket for user:', userId);

    // If user has temporary ID, try to refresh with real data
    if (user.isTemporary || userId.toString().startsWith('temp-')) {
      refreshUserData(user);
    }

    // Initialize socket connection with better configuration
    socketRef.current = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    const socket = socketRef.current;

    // Join the user to their room when socket connects
    socket.on('connect', () => {
      console.log('🔌 Connected to notification server');
      socket.emit('join', userId);
    });

    // Listen for registration updates (primarily for employees)
    socket.on('registrationUpdate', (data) => {
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
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...currentUser, status: 'approved' };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Only redirect if not already on employee dashboard
        setTimeout(() => {
          if (window.location.pathname !== '/employee') {
            window.location.href = '/employee';
          }
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
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...currentUser, status: 'rejected' };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    });

    // Listen for other general notifications (for approved users)
    socket.on('generalNotification', (data) => {
      toast.info(data.message, {
        position: "top-right",
        autoClose: 5000,
      });
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from notification server:', reason);
    });

    // Cleanup on component unmount
    return () => {
      console.log('🔌 Cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Function to refresh user data if temporary
  const refreshUserData = async (user) => {
    try {
      console.log('🔄 Refreshing user data for:', user.email);
      
      const response = await axios.post('http://localhost:5000/api/auth/lookup-user', {
        email: user.email,
        role: user.role
      });
      
      if (response.data.user) {
        const refreshedUser = response.data.user;
        console.log('✅ Refreshed user data:', refreshedUser);
        
        // Update localStorage with real user data
        localStorage.setItem('user', JSON.stringify(refreshedUser));
        userRef.current = refreshedUser;
        
        // Reconnect socket with real user ID if needed
        if (socketRef.current && socketRef.current.connected) {
          const realUserId = refreshedUser.id || refreshedUser._id;
          socketRef.current.emit('join', realUserId);
          console.log('🔄 Updated socket room to:', realUserId);
        }
      }
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
    }
  };

  // Function to manually trigger user data refresh
  const triggerUserRefresh = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.email && user.role) {
      refreshUserData(user);
    }
  };

  // Function to send a test notification (for debugging)
  const sendTestNotification = () => {
    if (socketRef.current && socketRef.current.connected) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.id || user._id;
      
      socketRef.current.emit('testNotification', {
        userId: userId,
        message: 'Test notification sent!'
      });
    }
  };

  return {
    socket: socketRef.current,
    triggerUserRefresh,
    sendTestNotification
  };
};

export default useNotifications;