// controllers/attendanceController.js
import Attendance from '../entities/Attendance.js';
import User from '../entities/User.js';
import mongoose from 'mongoose';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

// Record attendance (clock in or clock out)
export const recordAttendance = async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    // 🔍 EXTENSIVE DEBUGGING
    console.log('🔍 === ATTENDANCE DEBUG START ===');
    console.log('📝 Received employeeId:', employeeId);
    console.log('📝 employeeId type:', typeof employeeId);
    console.log('📝 employeeId length:', employeeId?.length);
    
    // Validate request
    if (!employeeId) {
      console.log('❌ No employeeId provided');
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }
    
    // 🔍 CHECK MONGODB CONNECTION
    console.log('🔗 MongoDB connection state:', mongoose.connection.readyState);
    console.log('🔗 MongoDB connection name:', mongoose.connection.name);
    
    // 🔍 TEST DIFFERENT QUERY METHODS
    console.log('🔍 Testing different query methods...');
    
    // Method 1: Direct findById
    console.log('🔍 Method 1: Employee.findById()');
    const employee1 = await User.findById(employeeId);
    console.log('📄 findById result:', employee1 ? 'FOUND' : 'NOT FOUND');
    if (employee1) console.log('📄 Employee1 data:', { id: employee1._id, name: employee1.name });
    
    // Method 2: findOne with _id
    console.log('🔍 Method 2: Employee.findOne({_id: employeeId})');
    const employee2 = await User.findOne({ _id: employeeId });
    console.log('📄 findOne result:', employee2 ? 'FOUND' : 'NOT FOUND');
    if (employee2) console.log('📄 Employee2 data:', { id: employee2._id, name: employee2.name });
    
    // Method 3: With ObjectId conversion
    console.log('🔍 Method 3: With ObjectId conversion');
    let employee3 = null;
    try {
      const objectId = new mongoose.Types.ObjectId(employeeId);
      console.log('📄 Converted to ObjectId:', objectId);
      employee3 = await User.findById(objectId);
      console.log('📄 ObjectId findById result:', employee3 ? 'FOUND' : 'NOT FOUND');
      if (employee3) console.log('📄 Employee3 data:', { id: employee3._id, name: employee3.name });
    } catch (objIdError) {
      console.log('❌ ObjectId conversion error:', objIdError.message);
    }
    
    // 🔍 CHECK COLLECTION DIRECTLY
    console.log('🔍 Checking collection directly...');
    const collection = mongoose.connection.db.collection('employees'); // or 'users' if that's your collection
    const directResult = await collection.findOne({ _id: new mongoose.Types.ObjectId(employeeId) });
    console.log('📄 Direct collection query result:', directResult ? 'FOUND' : 'NOT FOUND');
    if (directResult) console.log('📄 Direct result data:', { id: directResult._id, name: directResult.name });
    
    // 🔍 LIST ALL EMPLOYEES (first 5)
    console.log('🔍 Sampling existing employees...');
    const sampleEmployees = await User.find().limit(5);
    console.log('📄 Sample employees in database:');
    sampleEmployees.forEach((emp, index) => {
      console.log(`   ${index + 1}. ID: ${emp._id}, Name: ${emp.name || emp.username}`);
    });
    
    // 🔍 CHECK IF COLLECTION NAME IS CORRECT
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📄 Available collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Use the first successful employee query
    const employee = employee1 || employee2 || employee3;
    
    if (!employee) {
      console.log('❌ FINAL RESULT: Employee not found with any method');
      console.log('🔍 === ATTENDANCE DEBUG END ===');
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    console.log('✅ FINAL RESULT: Employee found!');
    console.log('📄 Employee details:', { id: employee._id, name: employee.name || employee.username });
    console.log('🔍 === ATTENDANCE DEBUG END ===');
    
    // 🔍 CONTINUE WITH NORMAL ATTENDANCE LOGIC...
    
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
    console.error('❌ Error recording attendance:', error);
    console.error('📄 Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


export const createManualAttendance = async (req, res) => {
  try {
    const { employeeId, date, timeIn, timeOut, status } = req.body;
    
    console.log('=== Manual Attendance Creation ===');
    console.log('Request body:', req.body);
    console.log('Admin user:', req.user.id);
    
    // Validation
    if (!employeeId || !date || !timeIn || !status) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, date, time in, and status are required'
      });
    }
    
    // Validate employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Parse the date and create start/end of day for comparison
    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    if (existingAttendance) {
      // Update existing attendance record
      console.log('Updating existing attendance record:', existingAttendance._id);
      
      // Parse time strings and create proper datetime objects
      const [inHour, inMinute] = timeIn.split(':');
      const clockInTime = new Date(attendanceDate);
      clockInTime.setHours(parseInt(inHour), parseInt(inMinute), 0, 0);
      
      let clockOutTime = null;
      if (timeOut) {
        const [outHour, outMinute] = timeOut.split(':');
        clockOutTime = new Date(attendanceDate);
        clockOutTime.setHours(parseInt(outHour), parseInt(outMinute), 0, 0);
      }
      
      // Calculate hours worked if both times are provided
      let hoursWorked = 0;
      if (clockOutTime && clockInTime) {
        hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert to hours
      }
      
      // Update the existing record
      existingAttendance.clockIn = clockInTime;
      existingAttendance.clockOut = clockOutTime;
      existingAttendance.status = status;
      existingAttendance.hoursWorked = hoursWorked;
      existingAttendance.isManualEntry = true;
      existingAttendance.enteredBy = req.user.id; // Track who made the manual entry
      existingAttendance.updatedAt = new Date();
      
      await existingAttendance.save();
      
      console.log('✅ Attendance record updated successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Attendance record updated successfully',
        data: existingAttendance
      });
      
    } else {
      // Create new attendance record
      console.log('Creating new attendance record for date:', date);
      
      // Parse time strings and create proper datetime objects
      const [inHour, inMinute] = timeIn.split(':');
      const clockInTime = new Date(attendanceDate);
      clockInTime.setHours(parseInt(inHour), parseInt(inMinute), 0, 0);
      
      let clockOutTime = null;
      if (timeOut) {
        const [outHour, outMinute] = timeOut.split(':');
        clockOutTime = new Date(attendanceDate);
        clockOutTime.setHours(parseInt(outHour), parseInt(outMinute), 0, 0);
      }
      
      // Calculate hours worked if both times are provided
      let hoursWorked = 0;
      if (clockOutTime && clockInTime) {
        hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert to hours
      }
      
      // Create new attendance record
      const newAttendance = new Attendance({
        employeeId,
        date: attendanceDate,
        clockIn: clockInTime,
        clockOut: clockOutTime,
        status,
        hoursWorked,
        isManualEntry: true,
        enteredBy: req.user.id, // Track who made the manual entry
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newAttendance.save();
      
      console.log('✅ New attendance record created successfully');
      
      return res.status(201).json({
        success: true,
        message: 'Manual attendance record created successfully',
        data: newAttendance
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating manual attendance:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Server error while creating manual attendance',
      error: error.message
    });
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