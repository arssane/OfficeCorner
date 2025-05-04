// routes/auth.js - Authentication routes
import express from 'express';
import { register, login, getMe, googleSignIn } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register and login routes
router.post('/register', register);
router.post('/login', login);

// Protected route to get current user
router.get('/me', protect, getMe);

// Google OAuth route - direct API endpoint for frontend to send Google token
router.post('/google', googleSignIn);

export default router;