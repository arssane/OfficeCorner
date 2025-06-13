import express from 'express';
import eventRoutes from './eventRoutes.js';

const router = express.Router();

// Mount event routes at /api/events
router.use('/events', eventRoutes);

export default router;