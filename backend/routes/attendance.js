// routes/attendance.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  recordAttendance, // for clock-in
  updateAttendance,   // new for clock-out
  getEmployeeAttendance,
  getTodayAttendance,
  getAllAttendance,
  updateAttendanceStatus,
  createManualAttendance
} from '../controllers/attendanceController.js';

const router = express.Router();

// Employee routes
router.post('/record', protect, recordAttendance); // Clock-in
router.put('/update/:id', protect, updateAttendance); // New: Clock-out/update specific record
router.get('/employee/:employeeId', protect, getEmployeeAttendance);
router.get('/today/:employeeId', protect, getTodayAttendance);

// Admin routes
router.get('/', protect, authorize('admin', 'manager'), getAllAttendance);
router.put('/:id', protect, authorize('admin', 'manager'), updateAttendanceStatus); // This is for admin changing status, not clock-out

// Manual attendance entry route for admins
router.post('/manual', protect, authorize('admin', 'manager'), createManualAttendance); 

export default router;
