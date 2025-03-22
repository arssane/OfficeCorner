// routes/auth.js - Authentication routes
import express from 'express';
import User from '../entities/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register and login routes
router.post('/register', register);
router.post('/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Validate input
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Please provide username, password, and role' });
        }

        // Find user by username
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Ensure the selected role matches the user’s role in the database
        if (user.role !== role) {
            return res.status(403).json({ message: `You are not authorized as ${role}` });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Respond with user data and token
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            },
            redirectTo: user.role === 'Administrator' ? '/admin' : '/dashboard',
            redirectTo: user.role === 'Employee' ? '/employee' : '/dashboard'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Protected route to get current user
router.get('/me', protect, getMe);

export default router;