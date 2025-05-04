// controllers/authController.js
import User from '../entities/User.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate input
    if (!username || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'Please provide username, email, password, and role' 
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Validate role
    if (!['Administrator', 'Employee'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    // Create user
    const newUser = await User.create({
      username,
      email,
      password, // Will be hashed by pre-save hook
      role
    });

    // Generate token
    const token = generateToken(newUser);

    // Return user data and token
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      redirectTo: newUser.role === 'Administrator' ? '/admin' : '/dashboard'
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
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Please provide email and password' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

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
        role: user.role
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
    
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    next(error);
  }
};

// Controller: Google Sign-in
export const googleSignIn = async (req, res) => {
  // Changed from tokenId to token to match what frontend sends
  const { token, role } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token, // Use the token sent from frontend
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (user) {
      // If user exists, check role if provided
      if (role && user.role !== role) {
        return res.status(403).json({ message: `You are not authorized as ${role}` });
      }
    } else {
      // For new users, require role selection
      if (!role) {
        return res.status(400).json({ message: 'Role must be selected for new users' });
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
      });
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
      },
      redirectTo: user.role === 'Administrator' ? '/admin' : '/dashboard',
    });
  } catch (err) {
    console.error('Google Sign-in error:', err);
    res.status(400).json({ message: 'Invalid Google token' });
  }
};