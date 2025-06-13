import express from 'express';
import { getDashboardAnalytics, getDetailedAnalytics } from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics data
// @access  Private (All authenticated users)
router.get('/dashboard', protect, getDashboardAnalytics);

// @route   GET /api/analytics/detailed
// @desc    Get detailed analytics data
// @access  Private (Admin only - you can add admin middleware if needed)
router.get('/detailed', protect, getDetailedAnalytics);

export default router;