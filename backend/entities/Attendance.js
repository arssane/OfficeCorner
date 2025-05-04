// entities/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  timeIn: {
    type: String,
    required: true
  },
  timeOut: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent', 'Vacation', 'Sick', 'Half-day'],
    default: 'Present'
  },
  notes: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: 'Office'
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
    const timeIn = new Date(`1970/01/01 ${this.timeIn}`);
    const timeOut = new Date(`1970/01/01 ${this.timeOut}`);
    
    // Check if timeOut is before timeIn (which would mean crossing midnight)
    if (timeOut < timeIn) {
      timeOut.setDate(timeOut.getDate() + 1);
    }
    
    this.duration = Math.floor((timeOut - timeIn) / 60000); // Convert ms to minutes
    return this.duration;
  }
  return 0;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;