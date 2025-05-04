import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: String,
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries on date field
eventSchema.index({ date: 1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;