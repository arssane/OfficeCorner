import express from 'express';
import {
  getAllEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent
} from '../controllers/eventController.js';

const router = express.Router();

// GET /api/events - Get all events
// POST /api/events - Create new event
router.route('/').get(getAllEvents).post(createEvent);

// GET /api/events/:id - Get single event
// PUT /api/events/:id - Update event
// DELETE /api/events/:id - Delete event
router.route('/:id').get(getEvent).put(updateEvent).delete(deleteEvent);

export default router;