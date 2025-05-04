import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employeeId: {
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
    default: '-'
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
    type: String,
    default: '-'
  }
}, {
  timestamps: true
});

// Add method to calculate duration
attendanceSchema.methods.calculateDuration = function() {
  if (this.timeIn && this.timeOut && this.timeOut !== '-') {
    const timeIn = new Date(`1970/01/01 ${this.timeIn}`);
    const timeOut = new Date(`1970/01/01 ${this.timeOut}`);
    
    // Check if timeOut is before timeIn (which would mean crossing midnight)
    if (timeOut < timeIn) {
      timeOut.setDate(timeOut.getDate() + 1);
    }
    
    const diffMs = timeOut - timeIn;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    this.duration = `${hours}h ${minutes}m`;
    return this.duration;
  }
  return '-';
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance; 