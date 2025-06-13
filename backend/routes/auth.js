// routes/auth.js - Updated authentication routes with Email OTP endpoints
import express from 'express';
import { 
  register, 
  login, 
  getMe, 
  googleCheck, 
  googleSignin, 
  googleSignup, 
  googleLookup,
  // New email OTP functions
  sendOTPEmail,
  verifyOTPCode,
  emailRegister,
  emailLogin
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Traditional register and login routes (backward compatibility)
router.post('/register', register);
router.post('/login', login);

// Email OTP routes
router.post('/send-otp', sendOTPEmail);           // Send OTP to email
router.post('/verify-otp', verifyOTPCode);        // Verify OTP code
router.post('/email-register', emailRegister);    // Register with email verification
router.post('/email-login', emailLogin);          // Login with email and OTP

// Protected route to get current user
router.get('/me', protect, getMe);

// Google OAuth routes
router.post('/google-check', googleCheck);        // Check if Google user exists
router.post('/google-signin', googleSignin);      // Google sign-in for existing users
router.post('/google-signup', googleSignup);      // Google sign-up for new users
router.post('/google-lookup', googleLookup);      // Lookup pending user data

export default router;