// controllers/attendanceController.js
import Attendance from '../entities/Attendance.js';
import Employee from '../entities/Employee.js';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

// Record attendance (clock in or clock out)
export const recordAttendance = async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    // Validate request
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }
    
    // Check if the employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // Get current date (without time)
    const today = new Date();
    const currentDate = startOfDay(today);
    const endDate = endOfDay(today);
    
    // Format current time
    const currentTime = format(today, 'hh:mm a');
    
    // Find attendance record for today
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: currentDate, $lte: endDate }
    });
    
    // If no record exists, create a new one (clock in)
    if (!attendance) {
      attendance = new Attendance({
        employee: employeeId,
        date: today,
        timeIn: currentTime,
        status: today.getHours() >= 9 && today.getMinutes() > 15 ? 'Late' : 'Present'
      });
      
      await attendance.save();
      
      return res.status(201).json({
        success: true,
        message: 'Clocked in successfully',
        data: {
          timeIn: attendance.timeIn,
          timeOut: '-',
          status: attendance.status
        }
      });
    } 
    // If record exists but no timeOut, update it (clock out)
    else if (!attendance.timeOut || attendance.timeOut === '-' || attendance.timeOut === null) {
      attendance.timeOut = currentTime;
      
      // Calculate duration
      attendance.calculateDuration();
      
      await attendance.save();
      
      return res.status(200).json({
        success: true,
        message: 'Clocked out successfully',
        data: {
          timeIn: attendance.timeIn,
          timeOut: attendance.timeOut,
          status: attendance.status,
          duration: attendance.duration
        }
      });
    } 
    // If already clocked in and out
    else {
      return res.status(400).json({
        success: false,
        message: 'Already clocked in and out for today',
        data: {
          timeIn: attendance.timeIn,
          timeOut: attendance.timeOut,
          status: attendance.status
        }
      });
    }
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get employee's attendance history
export const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { from, to } = req.query;
    
    // Validate request
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }
    
    // Build date filter
    let dateFilter = {};
    
    if (from && to) {
      dateFilter = {
        date: {
          $gte: startOfDay(parseISO(from)),
          $lte: endOfDay(parseISO(to))
        }
      };
    } else if (from) {
      dateFilter = {
        date: { $gte: startOfDay(parseISO(from)) }
      };
    } else if (to) {
      dateFilter = {
        date: { $lte: endOfDay(parseISO(to)) }
      };
    } else {
      // Default to current month if no dates specified
      const currentDate = new Date();
      dateFilter = {
        date: {
          $gte: startOfMonth(currentDate),
          $lte: endOfMonth(currentDate)
        }
      };
    }
    
    // Find attendance records
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      ...dateFilter
    }).sort({ date: -1 });
    
    // Format attendance records for frontend
    const formattedRecords = attendanceRecords.map(record => ({
      id: record._id,
      date: format(record.date, 'MMM dd, yyyy'),
      timeIn: record.timeIn || '-',
      timeOut: record.timeOut || '-',
      status: record.status,
      duration: record.duration,
      notes: record.notes
    }));
    
    res.status(200).json({
      success: true,
      count: formattedRecords.length,
      data: formattedRecords
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get attendance for today
export const getTodayAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Validate request
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }
    
    // Get current date range
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);
    
    // Find today's attendance
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    if (!attendance) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No attendance record for today'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: attendance._id,
        date: format(attendance.date, 'MMM dd, yyyy'),
        timeIn: attendance.timeIn || '-',
        timeOut: attendance.timeOut || '-',
        status: attendance.status,
        duration: attendance.duration
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// For admin: Get all attendance records with pagination and filters
export const getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, department, date, employeeName } = req.query;
    
    // Build query with filters
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (date) {
      const searchDate = new Date(date);
      query.date = {
        $gte: startOfDay(searchDate),
        $lte: endOfDay(searchDate)
      };
    }
    
    // Find employees and departments in a separate query if needed
    if (department || employeeName) {
      let employeeQuery = {};
      
      if (department) {
        employeeQuery.department = department;
      }
      
      if (employeeName) {
        employeeQuery.name = { $regex: employeeName, $options: 'i' };
      }
      
      const employees = await Employee.find(employeeQuery).select('_id');
      const employeeIds = employees.map(emp => emp._id);
      
      query.employee = { $in: employeeIds };
    }
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const attendanceRecords = await Attendance.find(query)
      .populate('employee', 'name email department position')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Attendance.countDocuments(query);
    
    // Format attendance records
    const formattedRecords = attendanceRecords.map(record => ({
      id: record._id,
      employeeId: record.employee._id,
      employeeName: record.employee.name,
      employeeEmail: record.employee.email,
      department: record.employee.department,
      position: record.employee.position,
      date: format(record.date, 'MMM dd, yyyy'),
      timeIn: record.timeIn || '-',
      timeOut: record.timeOut || '-',
      status: record.status,
      duration: record.duration,
      notes: record.notes,
      location: record.location
    }));
    
    res.status(200).json({
      success: true,
      count: formattedRecords.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: formattedRecords
    });
  } catch (error) {
    console.error('Error fetching all attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// For admin: Mark employee as absent, on vacation, sick, etc.
export const updateAttendanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Validate status
    const validStatuses = ['Present', 'Late', 'Absent', 'Vacation', 'Sick', 'Half-day'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Find and update attendance
    const attendance = await Attendance.findById(id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    attendance.status = status;
    
    if (notes) {
      attendance.notes = notes;
    }
    
    // If marking as absent, clear timeIn/timeOut
    if (status === 'Absent') {
      attendance.timeIn = '-';
      attendance.timeOut = '-';
      attendance.duration = 0;
    }
    
    await attendance.save();
    
    res.status(200).json({
      success: true,
      message: 'Attendance status updated successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error updating attendance status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export default {
  recordAttendance,
  getEmployeeAttendance,
  getTodayAttendance,
  getAllAttendance,
  updateAttendanceStatus
};