// entities/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Changed from 'Employee' to 'User' as per attendanceController.js
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  timeIn: {
    type: String, // Storing as ISO string to preserve full date/time
    required: true
  },
  timeOut: {
    type: String, // Storing as ISO string to preserve full date/time
    default: null
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent', 'Vacation', 'Sick', 'Half-day'],
    default: 'Present'
  },
  isLate: { // New field for late clock-in status
    type: Boolean,
    default: false
  },
  isOvertime: { // New field for overtime clock-out status
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: 'Office'
  },
  latitude: { // New field for latitude
    type: Number,
    default: null
  },
  longitude: { // New field for longitude
    type: Number,
    default: null
  },
  recordedByAdmin: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number, // Duration in minutes
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
attendanceSchema.index({ employee: 1, date: 1 });

// Create a compound unique index to prevent duplicate entries for the same employee on the same day
attendanceSchema.index({ employee: 1, date: 1 }, { 
  unique: true, 
  partialFilterExpression: { status: { $in: ['Present', 'Late'] } }
});

// Add method to calculate duration when timeOut is provided
attendanceSchema.methods.calculateDuration = function() {
  if (this.timeIn && this.timeOut && this.timeOut !== '-') {
    const timeInDate = new Date(this.timeIn); // Parse ISO string
    const timeOutDate = new Date(this.timeOut); // Parse ISO string
    
    // IMPORTANT: Check if dates are valid before performing calculation
    if (isNaN(timeInDate.getTime()) || isNaN(timeOutDate.getTime())) {
      console.warn("Invalid date(s) found in attendance record for duration calculation.", { timeIn: this.timeIn, timeOut: this.timeOut });
      this.duration = 0; // Set duration to 0 if dates are invalid
      return 0;
    }

    // Check if timeOut is before timeIn (which would mean crossing midnight)
    // For simplicity, if timeOut is earlier on the same date, assume it's still for the same day.
    // If actual overnight shifts are needed, the date field should also be considered.
    // For now, assume timeIn is always before timeOut for a single day's attendance.
    
    this.duration = Math.floor((timeOutDate - timeInDate) / 60000); // Convert ms to minutes
    return this.duration;
  }
  this.duration = 0; // Set duration to 0 if timeIn or timeOut are missing/invalid
  return 0;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
