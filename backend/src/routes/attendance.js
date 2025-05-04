import express from 'express';
import Attendance from '../models/Attendance.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Record attendance
router.post('/record', auth, async (req, res) => {
  try {
    const { employeeId, timeIn, timeOut, status, notes, location } = req.body;
    
    // Check if there's already an attendance record for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let attendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance) {
      // Create new attendance record
      attendance = new Attendance({
        employeeId,
        timeIn,
        status: status || 'Present',
        notes,
        location,
        recordedByAdmin: req.user.role === 'admin'
      });
    } else if (timeOut) {
      // Update existing record with time out
      attendance.timeOut = timeOut;
      attendance.notes = notes || attendance.notes;
      attendance.location = location || attendance.location;
      attendance.calculateDuration();
    }

    await attendance.save();
    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ success: false, message: 'Error recording attendance' });
  }
});

// Get attendance history for an employee
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    
    let query = { employeeId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(30);
    
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance history' });
  }
});

// Get all attendance records (for admin)
router.get('/all', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { startDate, endDate, status, department } = req.query;
    
    let query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (status) {
      query.status = status;
    }
    
    let populateQuery = 'employeeId';
    if (department) {
      populateQuery = {
        path: 'employeeId',
        match: { department }
      };
    }

    const attendance = await Attendance.find(query)
      .populate(populateQuery, 'name email department position')
      .sort({ date: -1 });
    
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Error fetching all attendance records:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance records' });
  }
});

// Update attendance status (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { status, notes } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    attendance.status = status || attendance.status;
    attendance.notes = notes || attendance.notes;
    attendance.recordedByAdmin = true;
    
    await attendance.save();
    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ success: false, message: 'Error updating attendance' });
  }
});

export default router; 