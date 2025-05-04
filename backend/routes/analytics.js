import express from 'express';
import { getDashboardAnalytics } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all analytics routes
router.use(protect);

// Admin-only analytics routes
router.get('/dashboard', authorize('Administrator'), getDashboardAnalytics);

export default router;