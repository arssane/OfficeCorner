// controllers/authController.js - Fixed version
import User from '../entities/User.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, status: user.status },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// Updated register function in authController.js
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

    // *** CRITICAL FIX: Check account status for ALL users, not just Employees ***
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

    // *** ADDITIONAL SECURITY: Check status even for authenticated users ***
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

// Controller: Google Sign-in
export const googleSignIn = async (req, res) => {
  const { token, role } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (user) {
      // If user exists, check role if provided
      if (role && user.role !== role) {
        return res.status(403).json({ message: `You are not authorized as ${role}` });
      }

      // *** CRITICAL FIX: Check account status for ALL users, not just Employees ***
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
            statusCode: 'ACCOUNT_PENDING'
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
    } else {
      // For new users, require role selection but PREVENT Administrator
      if (!role) {
        return res.status(400).json({ message: 'Role must be selected for new users' });
      }

      // PREVENT ADMINISTRATOR REGISTRATION VIA GOOGLE
      if (role === 'Administrator') {
        return res.status(403).json({ 
          message: 'Administrator accounts cannot be created through Google Sign-in. Please contact your system administrator.' 
        });
      }

      // Generate random password for new Google users
      const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

      // Create new user with a username derived from email
      const username = name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
      
      user = await User.create({
        username,
        email,
        password, // Will be hashed by pre-save hook
        role,
        name
      });

      // For Employee role via Google, return pending status message
      if (role === 'Employee') {
        return res.status(201).json({
          message: 'Google Sign-in successful! Your account is pending approval from an administrator. You will be notified once approved.',
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            name: user.name
          },
          requiresApproval: true
        });
      }
    }

    const jwtToken = generateToken(user);

    res.status(200).json({
      message: 'Google Sign-in successful',
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name
      },
      redirectTo: user.role === 'Administrator' ? '/admin' : '/dashboard',
    });
  } catch (err) {
    console.error('Google Sign-in error:', err);
    res.status(400).json({ message: 'Invalid Google token' });
  }
};