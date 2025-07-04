// eventController.js
import Event from '../entities/Event.js';
import User from '../entities/User.js'; // Assuming a User model exists for email lookup
import { sendEventAssignmentEmail } from '../services/emailService.js'; // Import new email function

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1, startTime: 1 }); // Sort by start time too
    
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
    // Destructure all expected fields, including new ones
    const { title, description, date, startTime, endTime, location, type, visibility, link, assignedTo } = req.body;
    
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
      endTime,
      location,   // Save new fields
      type,       // Save new fields
      visibility, // Save new fields
      link,       // Save new fields
      assignedTo  // Save assignedTo field
    });

    // NEW: Send email notification if event is assigned to a user
    if (assignedTo) {
      try {
        // Attempt to find the user by their ID
        const assignedUser = await User.findById(assignedTo); 
        
        if (assignedUser && assignedUser.email) {
          const eventDetails = {
            title: event.title,
            description: event.description,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            type: event.type,
            assignedUserName: assignedUser.name || assignedUser.username || assignedUser.email, // Use a display name for the email
          };
          
          // Admin-provided link (can be empty)
          const adminProvidedEventLink = event.link; 
          // Default site link for viewing the event on the calendar
          const siteLink = `${process.env.FRONTEND_URL}/calendar?viewEvent=${event._id}`; 

          // Pass both links to the email service
          await sendEventAssignmentEmail(assignedUser.email, eventDetails, adminProvidedEventLink, siteLink);
        } else {
          console.warn(`Assigned user with ID ${assignedTo} not found or has no email. Email notification skipped.`);
        }
      } catch (emailError) {
        console.error('Error sending event assignment email:', emailError);
        // Do not block event creation if email fails
      }
    }
    
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
        message: messages.join(', ')});
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
    // Destructure all expected fields for update
    const { title, description, date, startTime, endTime, location, type, visibility, link, assignedTo } = req.body;
    
    // Find and update event
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { title, description, date, startTime, endTime, location, type, visibility, link, assignedTo }, // Include new fields here
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