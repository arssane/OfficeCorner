// routes/attendance.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  recordAttendance,
  getEmployeeAttendance,
  getTodayAttendance,
  getAllAttendance,
  updateAttendanceStatus
} from '../controllers/attendanceController.js';

const router = express.Router();

// Employee routes
router.post('/record', protect, recordAttendance);
router.get('/employee/:employeeId', protect, getEmployeeAttendance);
router.get('/today/:employeeId', protect, getTodayAttendance);

// Admin routes
router.get('/', protect, authorize('admin', 'manager'), getAllAttendance);
router.put('/:id', protect, authorize('admin', 'manager'), updateAttendanceStatus);

export default router;