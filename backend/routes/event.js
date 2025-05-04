import express from 'express';
import Event from '../entities/Event.js';

const router = express.Router();

// Add a new event
router.post('/', async (req, res) => {
  const { title, description, date } = req.body;

  if (!title || !description || !date) {
    return res.status(400).json({ message: 'All fields (title, description, date) are required' });
  }

  try {
    const newEvent = new Event({
      title,
      description,
      date,
    });
    await newEvent.save();
    res.status(201).json({
      message: 'Event added successfully',
      event: newEvent,
    });
  } catch (error) {
    console.error('Error adding event:', error);
    res.status(500).json({
      message: 'Error adding event',
      error: error.message,
    });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      message: 'Error fetching events',
      error: error.message,
    });
  }
});

// Get events by date (Date format should be 'YYYY-MM-DD')
router.get('/:date', async (req, res) => {
    const { date } = req.params;
  
    // Basic format check (optional but recommended)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use "YYYY-MM-DD".' });
    }
  
    try {
      const events = await Event.find({ date }); // No need to convert to Date object
      res.status(200).json(events);
    } catch (error) {
      console.error('Error fetching events for date:', error);
      res.status(500).json({
        message: 'Error fetching events for this date',
        error: error.message,
      });
    }
  });  

// Delete an event
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      message: 'Error deleting event',
      error: error.message,
    });
  }
});

export default router;
