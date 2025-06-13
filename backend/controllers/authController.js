// controllers/authController.js - Updated with Email OTP authentication
import User from '../entities/User.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { sendOTP, verifyOTP } from '../services/emailService.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, status: user.status },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Helper function to verify Google token
const verifyGoogleToken = async (token) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    return ticket.getPayload();
  } catch (error) {
    console.error('Google token verification error:', error);
    throw new Error('Invalid Google token');
  }
};

// @desc    Send OTP for email verification
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOTPEmail = async (req, res) => {
  try {
    const { email, purpose = 'verification' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please use a valid email address' });
    }

    // For login purpose, check if user exists
    if (purpose === 'login') {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user account is active
      if (user.status === 'rejected') {
        return res.status(403).json({ 
          message: 'Your account has been rejected. Please contact your administrator.',
          statusCode: 'ACCOUNT_REJECTED'
        });
      }
      
      if (user.status === 'pending') {
        return res.status(403).json({ 
          message: 'Your account is pending approval.',
          statusCode: 'ACCOUNT_PENDING'
        });
      }
    }

    // For 'verification' and 'google-signup-verification' purposes, check if user already exists
    if (purpose === 'verification' || purpose === 'google-signup-verification') {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.status !== 'rejected') {
        // If an active user exists, prevent OTP send for new registration
        return res.status(400).json({ message: 'Email already in use by an active account.' });
      }
      // If user exists and is rejected, or user doesn't exist, allow OTP to be sent
    }


    // Send OTP
    const result = await sendOTP(email, purpose);
    
    if (result.success) {
      res.status(200).json({ 
        message: `OTP sent to ${email}`,
        success: true 
      });
    } else {
      res.status(500).json({ 
        message: result.message,
        success: false 
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error while sending OTP' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTPCode = async (req, res) => {
  try {
    const { email, otp, purpose = 'verification' } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP
    const result = verifyOTP(email, otp, purpose);
    
    if (result.success) {
      // For login purpose, authenticate user immediately
      if (purpose === 'login') {
        const user = await User.findOne({ email });
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Generate token
        const token = generateToken(user);

        return res.status(200).json({
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            name: user.name
          },
          redirectTo: user.role === 'Administrator' ? '/admin' : '/dashboard'
        });
      }

      // For other purposes, just confirm verification
      res.status(200).json({ 
        message: result.message,
        success: true,
        verified: true
      });
    } else {
      res.status(400).json({ 
        message: result.message,
        success: false 
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error while verifying OTP' });
  }
};

// @desc    Register with email verification
// @route   POST /api/auth/email-register
// @access  Public
export const emailRegister = async (req, res, next) => {
  try {
    const { username, email, password, role, name, phone, address, otp } = req.body;

    // Validate input
    if (!username || !email || !password || !role || !otp) {
      return res.status(400).json({ 
        message: 'Please provide username, email, password, role, and OTP' 
      });
    }

    // Verify OTP first
    const otpResult = verifyOTP(email, otp, 'verification');
    if (!otpResult.success) {
      return res.status(400).json({ message: otpResult.message });
    }

    // PREVENT ADMINISTRATOR REGISTRATION
    if (role === 'Administrator') {
      return res.status(403).json({ 
        message: 'Administrator accounts cannot be created through registration. Please contact your system administrator.' 
      });
    }

    // Check for existing users
    const existingUserByEmail = await User.findOne({ email });
    const existingUserByUsername = await User.findOne({ username });

    // Handle existing email
    if (existingUserByEmail) {
      // If user was rejected, allow re-registration by updating the existing record
      if (existingUserByEmail.status === 'rejected') {
        console.log(`🔄 Allowing re-registration for rejected user: ${email}`);
        
        // Update the existing rejected user record
        existingUserByEmail.username = username;
        existingUserByEmail.password = password; // Will be hashed by pre-save hook
        existingUserByEmail.role = role;
        existingUserByEmail.name = name;
        existingUserByEmail.phone = phone;
        existingUserByEmail.address = address;
        existingUserByEmail.status = role === 'Employee' ? 'pending' : 'approved';
        
        // Clear rejection data
        existingUserByEmail.rejectedAt = undefined;
        existingUserByEmail.rejectedBy = undefined;
        existingUserByEmail.rejectionReason = undefined;
        
        // Update timestamps
        existingUserByEmail.createdAt = new Date();
        
        await existingUserByEmail.save();

        // For Employee role, return pending status message
        if (role === 'Employee') {
          return res.status(201).json({
            message: 'Re-registration successful! Your account is pending approval from an administrator. You will be notified once approved.',
            user: {
              id: existingUserByEmail._id,
              username: existingUserByEmail.username,
              email: existingUserByEmail.email,
              role: existingUserByEmail.role,
              status: existingUserByEmail.status,
              name: existingUserByEmail.name
            },
            requiresApproval: true
          });
        }

        // For other roles, generate token and allow login
        const token = generateToken(existingUserByEmail);

        return res.status(201).json({
          message: 'Re-registration successful',
          token,
          user: {
            id: existingUserByEmail._id,
            username: existingUserByEmail.username,
            email: existingUserByEmail.email,
            role: existingUserByEmail.role,
            status: existingUserByEmail.status,
            name: existingUserByEmail.name
          },
          redirectTo: '/dashboard'
        });
      }
      
      // If user exists and is not rejected, prevent registration
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Handle existing username (only check if not updating a rejected user)
    if (existingUserByUsername && existingUserByUsername.status !== 'rejected') {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Validate role (excluding Administrator)
    if (!['Employee', 'User'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password, // Will be hashed by pre-save hook
      role,
      name,
      phone,
      address
    });

    // For Employee role, return pending status message
    if (role === 'Employee') {
      return res.status(201).json({
        message: 'Registration successful! Your account is pending approval from an administrator. You will be notified once approved.',
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          name: newUser.name
        },
        requiresApproval: true
      });
    }

    // For other roles, generate token and allow login
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        name: newUser.name
      },
      redirectTo: '/dashboard'
    });
  } catch (error) {
    console.error('Email registration error:', error);
    next(error);
  }
};

// @desc    Login with email and OTP
// @route   POST /api/auth/email-login
// @access  Public
export const emailLogin = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ 
        message: 'Please provide email and OTP' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    const otpResult = verifyOTP(email, otp, 'login');
    if (!otpResult.success) {
      return res.status(400).json({ message: otpResult.message });
    }

    // Check account status
    if (user.status === 'rejected') {
      return res.status(403).json({ 
        message: 'Your account has been rejected. Please contact your administrator for more information.',
        statusCode: 'ACCOUNT_REJECTED'
      });
    }

    if (user.status === 'pending') {
      if (user.role === 'Employee') {
        return res.status(403).json({ 
          message: 'Your account is pending approval from an administrator. Please wait for approval before logging in.',
          statusCode: 'ACCOUNT_PENDING',
          redirect: '/employee-pending'
        });
      } else {
        return res.status(403).json({ 
          message: 'Your account is pending activation. Please contact your administrator.',
          statusCode: 'ACCOUNT_PENDING'
        });
      }
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ 
        message: 'Your account is not active. Please contact your administrator.',
        statusCode: 'ACCOUNT_INACTIVE'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name
      },
      redirectTo: user.role === 'Administrator' ? '/admin' : '/dashboard'
    });
  } catch (error) {
    console.error('Email login error:', error);
    next(error);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { username, email, password, role, name, phone, address } = req.body;

    // Validate input
    if (!username || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'Please provide username, email, password, and role' 
      });
    }

    // PREVENT ADMINISTRATOR REGISTRATION
    if (role === 'Administrator') {
      return res.status(403).json({ 
        message: 'Administrator accounts cannot be created through registration. Please contact your system administrator.' 
      });
    }

    // Check for existing users
    const existingUserByEmail = await User.findOne({ email });
    const existingUserByUsername = await User.findOne({ username });

    // Handle existing email
    if (existingUserByEmail) {
      // If user was rejected, allow re-registration by updating the existing record
      if (existingUserByEmail.status === 'rejected') {
        console.log(`🔄 Allowing re-registration for rejected user: ${email}`);
        
        // Update the existing rejected user record
        existingUserByEmail.username = username;
        existingUserByEmail.password = password; // Will be hashed by pre-save hook
        existingUserByEmail.role = role;
        existingUserByEmail.name = name;
        existingUserByEmail.phone = phone;
        existingUserByEmail.address = address;
        existingUserByEmail.status = role === 'Employee' ? 'pending' : 'approved';
        
        // Clear rejection data
        existingUserByEmail.rejectedAt = undefined;
        existingUserByEmail.rejectedBy = undefined;
        existingUserByEmail.rejectionReason = undefined;
        
        // Update timestamps
        existingUserByEmail.createdAt = new Date();
        
        await existingUserByEmail.save();

        // For Employee role, return pending status message
        if (role === 'Employee') {
          return res.status(201).json({
            message: 'Re-registration successful! Your account is pending approval from an administrator. You will be notified once approved.',
            user: {
              id: existingUserByEmail._id,
              username: existingUserByEmail.username,
              email: existingUserByEmail.email,
              role: existingUserByEmail.role,
              status: existingUserByEmail.status,
              name: existingUserByEmail.name
            },
            requiresApproval: true
          });
        }

        // For other roles, generate token and allow login
        const token = generateToken(existingUserByEmail);

        return res.status(201).json({
          message: 'Re-registration successful',
          token,
          user: {
            id: existingUserByEmail._id,
            username: existingUserByEmail.username,
            email: existingUserByEmail.email,
            role: existingUserByEmail.role,
            status: existingUserByEmail.status,
            name: existingUserByEmail.name
          },
          redirectTo: '/dashboard'
        });
      }
      
      // If user exists and is not rejected, prevent registration
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Handle existing username (only check if not updating a rejected user)
    if (existingUserByUsername && existingUserByUsername.status !== 'rejected') {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // If username belongs to a rejected user with different email, allow reuse
    if (existingUserByUsername && existingUserByUsername.status === 'rejected' && existingUserByUsername.email !== email) {
      // The username can be reused since the previous user was rejected
      console.log(`🔄 Allowing username reuse from rejected user: ${username}`);
    }

    // Validate role (excluding Administrator)
    if (!['Employee', 'User'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password, // Will be hashed by pre-save hook
      role,
      name,
      phone,
      address
    });

    // For Employee role, return pending status message
    if (role === 'Employee') {
      return res.status(201).json({
        message: 'Registration successful! Your account is pending approval from an administrator. You will be notified once approved.',
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          name: newUser.name
        },
        requiresApproval: true
      });
    }

    // For other roles, generate token and allow login
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        name: newUser.name
      },
      redirectTo: '/dashboard'
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password, role, username } = req.body;

    // Support both email and username login
    const loginField = email || username;
    
    // Validate input
    if (!loginField || !password) {
      return res.status(400).json({ 
        message: 'Please provide email/username and password' 
      });
    }

    // Find user by email OR username
    const user = await User.findOne({ 
      $or: [{ email: loginField }, { username: loginField }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // If role is specified, validate it
    if (role && user.role !== role) {
      return res.status(403).json({ message: `You are not authorized as ${role}` });
    }

    // Check account status for ALL users
    if (user.status === 'rejected') {
      return res.status(403).json({ 
        message: 'Your account has been rejected. Please contact your administrator for more information.',
        statusCode: 'ACCOUNT_REJECTED'
      });
    }

    if (user.status === 'pending') {
      // Different messages based on role
      if (user.role === 'Employee') {
        return res.status(403).json({ 
          message: 'Your account is pending approval from an administrator. Please wait for approval before logging in.',
          statusCode: 'ACCOUNT_PENDING',
          redirect: '/employee-pending'
        });
      } else {
        return res.status(403).json({ 
          message: 'Your account is pending activation. Please contact your administrator.',
          statusCode: 'ACCOUNT_PENDING'
        });
      }
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ 
        message: 'Your account is not active. Please contact your administrator.',
        statusCode: 'ACCOUNT_INACTIVE'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name
      },
      redirectTo: user.role === 'Administrator' ? '/admin' : '/dashboard'
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check status even for authenticated users
    if (user.status === 'rejected') {
      return res.status(403).json({ 
        message: 'Your account has been rejected.',
        statusCode: 'ACCOUNT_REJECTED'
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ 
        message: 'Your account is pending approval.',
        statusCode: 'ACCOUNT_PENDING'
      });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ 
        message: 'Your account is not active.',
        statusCode: 'ACCOUNT_INACTIVE'
      });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    next(error);
  }
};

// @desc    Check if Google user exists
// @route   POST /api/auth/google-check
// @access  Public
export const googleCheck = async (req, res) => {
  try {
    console.log('🔍 Google Check - Request Body:', req.body);
    
    const { token } = req.body;

    if (!token) {
      console.log('❌ No token found in request body');
      return res.status(400).json({ message: 'Google token is required' });
    }

    console.log('✅ Token received, length:', token.length);

    // Verify the Google token
    const payload = await verifyGoogleToken(token);
    const { email, name, picture } = payload;

    console.log('✅ Google token verified for:', email);

    // Check if user exists with Employee role specifically
    const user = await User.findOne({ email, role: 'Employee' });

    if (user) {
      return res.status(200).json({
        exists: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          name: user.name,
          profilePicture: user.profilePicture
        }
      });
    } else {
      return res.status(200).json({
        exists: false,
        googleUserInfo: {
          email,
          name,
          picture
        }
      });
    }

  } catch (error) {
    console.error('❌ Google check error:', error);
    res.status(400).json({ message: error.message || 'Invalid Google token' });
  }
};

// @desc    Unified Google Sign-in (for existing Employee users only)
// @route   POST /api/auth/google-signin
// @access  Public
export const googleSignin = async (req, res) => {
  try {
    console.log('🔍 Google Signin - Request Body:', req.body);
    
    const { token, role = 'Employee' } = req.body; // Default to Employee role

    if (!token) {
      console.log('❌ No token found in signin request');
      return res.status(400).json({ message: 'Google token is required' });
    }

    console.log('✅ Signin token received, length:', token.length);

    // Verify the Google token
    const payload = await verifyGoogleToken(token);
    const { email } = payload;

    // Find user by email and Employee role specifically
    const user = await User.findOne({ email, role: 'Employee' });

    if (!user) {
      return res.status(404).json({ 
        message: 'Employee account not found. Please sign up first.',
        statusCode: 'USER_NOT_FOUND'
      });
    }

    // Check account status
    if (user.status === 'rejected') {
      return res.status(403).json({ 
        message: 'Your account has been rejected. Please contact your administrator for more information.',
        statusCode: 'ACCOUNT_REJECTED'
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ 
        message: 'Your account is pending approval from an administrator. Please wait for approval before logging in.',
        statusCode: 'ACCOUNT_PENDING',
        redirect: '/employee-pending',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          name: user.name
        }
      });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ 
        message: 'Your account is not active. Please contact your administrator.',
        statusCode: 'ACCOUNT_INACTIVE'
      });
    }

    // Generate token for approved users
    const jwtToken = generateToken(user);

    return res.status(200).json({
      message: 'Google Sign-in successful',
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name,
        profilePicture: user.profilePicture
      },
      redirectTo: '/employee'
    });

  } catch (error) {
    console.error('❌ Google Sign-in error:', error);
    res.status(400).json({ message: error.message || 'Invalid Google token' });
  }
};

// @desc    Unified Google Sign-up (for new Employee users only)
// @route   POST /api/auth/google-signup
// @access  Public
export const googleSignup = async (req, res) => {
  try {
    console.log('🔍 Google Signup - Request Body:', req.body);
    
    const { token, username, phone, address, otp, email } = req.body; // Added otp and email

    if (!token) {
      console.log('❌ No token found in signup request');
      return res.status(400).json({ message: 'Google token is required' });
    }

    console.log('✅ Signup token received, length:', token.length);

    if (!username || !phone || !address || !otp || !email) { // OTP and email are now required
      return res.status(400).json({ 
        message: 'Please provide username, phone, address, email, and OTP' 
      });
    }

    // Verify OTP first for the Google email
    const otpResult = verifyOTP(email, otp, 'google-signup-verification');
    if (!otpResult.success) {
      return res.status(400).json({ message: otpResult.message });
    }

    // Force role to be Employee for Google signup
    const userRole = 'Employee';

    console.log('✅ Google signup restricted to Employee role only');

    // Verify the Google token again (optional but good for double-check, or verify once and pass payload)
    const payload = await verifyGoogleToken(token);
    // Ensure the email from Google token matches the provided email
    if (payload.email !== email) {
      return res.status(400).json({ message: 'Google email mismatch with provided email.' });
    }
    const { name, picture, sub: googleId } = payload;

    // Check if user already exists (double-check)
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      // Handle rejected users - allow re-registration
      if (existingUserByEmail.status === 'rejected') {
        console.log(`🔄 Allowing Google re-registration for rejected user: ${email}`);
        
        // Update the existing rejected user record
        existingUserByEmail.username = username;
        existingUserByEmail.role = userRole;
        existingUserByEmail.name = name;
        existingUserByEmail.phone = phone;
        existingUserByEmail.address = address;
        existingUserByEmail.status = 'pending'; // Always pending for Employee
        existingUserByEmail.googleId = googleId;
        existingUserByEmail.profilePicture = picture;
        
        // Clear rejection data
        existingUserByEmail.rejectedAt = undefined;
        existingUserByEmail.rejectedBy = undefined;
        existingUserByEmail.rejectionReason = undefined;
        
        // Update timestamps
        existingUserByEmail.createdAt = new Date();
        
        await existingUserByEmail.save();

        return res.status(201).json({
          message: 'Google Re-registration successful! Your Employee account is pending approval from an administrator. You will be notified once approved.',
          user: {
            id: existingUserByEmail._id,
            username: existingUserByEmail.username,
            email: existingUserByEmail.email,
            role: existingUserByEmail.role,
            status: existingUserByEmail.status,
            name: existingUserByEmail.name
          },
          requiresApproval: true
        });
      }
      
      return res.status(400).json({ 
        message: 'Email already in use',
        statusCode: 'EMAIL_EXISTS'
      });
    }

    // Check for existing username
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername && existingUserByUsername.status !== 'rejected') {
      return res.status(400).json({ 
        message: 'Username already taken',
        statusCode: 'USERNAME_EXISTS'
      });
    }

    // Generate random password for Google users (they won't use it for login)
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    // Create new Employee user
    const newUser = await User.create({
      username,
      email,
      password, // Will be hashed by pre-save hook
      role: userRole, // Always Employee
      name,
      phone,
      address,
      googleId,
      profilePicture: picture
    });

    // Employee accounts always require approval
    return res.status(201).json({
      message: 'Google Sign-up successful! Your Employee account is pending approval from an administrator. You will be notified once approved.',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        name: newUser.name
      },
      requiresApproval: true
    });

  } catch (error) {
    console.error('❌ Google Sign-up error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field} already exists`,
        statusCode: 'DUPLICATE_FIELD'
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Server error during Google sign-up' 
    });
  }
};

// @desc    Lookup pending user data (for Google users)
// @route   POST /api/auth/google-lookup
// @access  Public
export const googleLookup = async (req, res) => {
  try {
    console.log('🔍 Google Lookup - Request Body:', req.body);
    
    const { token } = req.body;

    if (!token) {
      console.log('❌ No token found in lookup request');
      return res.status(400).json({ message: 'Google token is required' });
    }

    console.log('✅ Lookup token received, length:', token.length);

    // Verify the Google token
    const payload = await verifyGoogleToken(token);
    const { email } = payload;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        statusCode: 'USER_NOT_FOUND'
      });
    }

    // Return full user data (especially useful for pending users)
    return res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name,
        phone: user.phone,
        address: user.address,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        // Include rejection info if rejected
        ...(user.status === 'rejected' && {
          rejectedAt: user.rejectedAt,
          rejectedBy: user.rejectedBy,
          rejectionReason: user.rejectionReason
        })
      }
    });

  } catch (error) {
    console.error('❌ Google Lookup error:', error);
    res.status(400).json({ message: error.message || 'Invalid Google token' });
  }
};
