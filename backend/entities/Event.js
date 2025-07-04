// entities/Event.js
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: '' // Ensure default for consistency
  },
  date: {
    type: String, // Storing as YYYY-MM-DD string
    required: [true, 'Event date is required']
  },
  startTime: {
    type: String,
    default: "09:00" // Default start time
  },
  endTime: {
    type: String,
    default: "10:00" // Default end time
  },
  location: { // Added location field
    type: String,
    trim: true,
    default: ''
  },
  type: { // Added type field
    type: String,
    enum: ['meeting', 'announcement', 'holiday', 'other'],
    default: 'other'
  },
  visibility: { // Added visibility field
    type: String,
    enum: ['public', 'private'],
    default: 'public' // Default to public so employees can see it
  },
  link: { // Added link field
    type: String,
    trim: true,
    default: ''
  },
  // NEW: Field to store the email of the person assigned to the event
  assignedTo: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries on date field
eventSchema.index({ date: 1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
