import Event from '../entities/Event.js';

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    
    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching events'
    });
  }
};

// Create a new event
export const createEvent = async (req, res) => {
  try {
    const { title, description, date, startTime, endTime } = req.body;
    
    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and date'
      });
    }
    
    const event = await Event.create({
      title,
      description,
      date,
      startTime,
      endTime
    });
    
    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating event'
    });
  }
};

// Get a single event
export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching event'
    });
  }
};

// Update an event
export const updateEvent = async (req, res) => {
  try {
    const { title, description, date, startTime, endTime } = req.body;
    
    // Find and update event
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { title, description, date, startTime, endTime },
      { new: true, runValidators: true }
    );
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating event'
    });
  }
};

// Delete an event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting event'
    });
  }
};