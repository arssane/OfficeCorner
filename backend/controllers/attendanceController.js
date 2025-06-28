// controllers/attendanceController.js
import Attendance from '../entities/Attendance.js';
import User from '../entities/User.js';
import mongoose from 'mongoose';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

// Configuration for allowed workspace location
// IMPORTANT: Replace with your actual workspace coordinates and desired radius
const WORKSPACE_LATITUDE = 27.6692;
const WORKSPACE_LONGITUDE = 85.2693;
const ALLOWED_RADIUS_METERS = 500;

/**
 * Calculates the distance between two sets of coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
};


// Record attendance (clock in)
export const recordAttendance = async (req, res) => {
  try {
    const { employeeId, latitude, longitude, timeIn } = req.body; // Expect timeIn as ISO string
    
    // 🔍 EXTENSIVE DEBUGGING
    console.log('🔍 === CLOCK-IN ATTENDANCE DEBUG START ===');
    console.log('📝 Received employeeId:', employeeId);
    console.log('📝 employeeId type:', typeof employeeId);
    console.log('📝 employeeId length:', employeeId?.length);
    console.log('📝 Received latitude:', latitude);
    console.log('📝 Received longitude:', longitude);
    console.log('📝 Received timeIn (ISO):', timeIn);
    
    // Validate request
    if (!employeeId) {
      console.log('❌ No employeeId provided');
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    if (latitude === undefined || longitude === undefined) {
      console.log('❌ Geolocation (latitude, longitude) is required.');
      return res.status(400).json({ success: false, message: 'Geolocation is required to record attendance.' });
    }
    
    // Perform geolocation check
    const distance = calculateDistance(
      latitude, 
      longitude, 
      WORKSPACE_LATITUDE, 
      WORKSPACE_LONGITUDE
    );

    console.log(`Calculated distance to workspace: ${distance.toFixed(2)} meters`);

    if (distance > ALLOWED_RADIUS_METERS) {
      console.log('❌ Employee is outside the allowed workspace area.');
      return res.status(403).json({ 
        success: false, 
        message: 'You are outside the designated workspace to record attendance. Distance from office: ' + distance.toFixed(2) + ' meters.' 
      });
    }
    console.log('✅ Employee is within the allowed workspace area.');
    
    // 🔍 CHECK MONGODB CONNECTION
    console.log('🔗 MongoDB connection state:', mongoose.connection.readyState);
    console.log('🔗 MongoDB connection name:', mongoose.connection.name);
    
    // Use the first successful employee query
    const employee = await User.findById(employeeId);
    
    if (!employee) {
      console.log('❌ FINAL RESULT: Employee not found with any method');
      console.log('🔍 === CLOCK-IN ATTENDANCE DEBUG END ===');
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    console.log('✅ FINAL RESULT: Employee found!');
    console.log('📄 Employee details:', { id: employee._id, name: employee.name || employee.username });
    
    // Get current date (without time for unique daily record check)
    const today = new Date(timeIn); // Use timeIn provided from frontend to determine the date
    const currentDate = startOfDay(today);
    const endDate = endOfDay(today);
    
    // Check if an attendance record already exists for today (prevents duplicate clock-ins for the same day)
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: currentDate, $lte: endDate }
    });
    
    if (attendance) {
      // If a record exists and already has a timeIn but no timeOut, it means they are currently clocked in.
      if (attendance.timeIn && (!attendance.timeOut || attendance.timeOut === null)) {
        console.log('Attempted clock-in but employee is already clocked in for today.');
        return res.status(400).json({
          success: false,
          message: 'Already clocked in for today. Please clock out first.',
          data: attendance // Return current state
        });
      } else if (attendance.timeIn && attendance.timeOut) {
        // If they clocked in and out today already
        console.log('Attempted clock-in but employee already clocked in and out for today.');
        return res.status(400).json({
          success: false,
          message: 'Already clocked in and out for today.',
          data: attendance
        });
      }
    }

    // Determine if late (clock-in outside 7 AM to 9:59 AM window)
    const clockInDateTime = new Date(timeIn);
    // User wants 1 AM to be late. If standard work starts at 9 AM,
    // then anything before 7 AM or at/after 10 AM is 'late'.
    const isLate = (clockInDateTime.getHours() < 7 || clockInDateTime.getHours() >= 10);

    // Create new attendance record (clock in)
    attendance = new Attendance({
      employee: employeeId,
      date: currentDate, // Store just the date part for unique index
      timeIn: timeIn, // Store the full ISO string for exact time
      status: isLate ? 'Late' : 'Present', // Set status based on isLate
      isLate: isLate, // Store isLate flag
      latitude: latitude,
      longitude: longitude
    });
    
    await attendance.save();
    
    console.log('✅ Clocked in successfully. Status:', attendance.status);
    console.log('🔍 === CLOCK-IN ATTENDANCE DEBUG END ===');

    return res.status(201).json({
      success: true,
      message: 'Clocked in successfully',
      data: attendance // Return the full attendance object
    });

  } catch (error) {
    console.error('❌ Error recording clock-in attendance:', error);
    console.error('📄 Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update attendance (clock out)
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params; // Attendance record ID
    const { timeOut } = req.body; // Expected timeOut as ISO string

    console.log('🔍 === CLOCK-OUT ATTENDANCE DEBUG START ===');
    console.log('📝 Received attendance ID:', id);
    console.log('📝 Received timeOut (ISO):', timeOut);

    if (!id) {
      return res.status(400).json({ success: false, message: 'Attendance record ID is required for update.' });
    }
    if (!timeOut) {
      return res.status(400).json({ success: false, message: 'Clock out time is required.' });
    }

    let attendance = await Attendance.findById(id);

    if (!attendance) {
      console.log('❌ Attendance record not found for ID:', id);
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    if (attendance.timeOut && attendance.timeOut !== null) {
      console.log('❌ Employee already clocked out for this record.');
      return res.status(400).json({ success: false, message: 'Employee already clocked out for this record.' });
    }

    // Update timeOut and recalculate duration
    attendance.timeOut = timeOut; // Store the full ISO string
    attendance.calculateDuration(); // Calculate duration based on timeIn and timeOut

    // Determine if overtime based on duration (e.g., > 8 hours or 480 minutes)
    // Assuming standard workday is 8 hours (480 minutes)
    const STANDARD_WORK_HOURS_MINUTES = 8 * 60; 
    const isOvertime = attendance.duration > STANDARD_WORK_HOURS_MINUTES;

    attendance.isOvertime = isOvertime; // Store isOvertime flag

    await attendance.save();

    console.log('✅ Clocked out successfully. Duration:', attendance.duration, 'minutes. Overtime:', attendance.isOvertime);
    console.log('🔍 === CLOCK-OUT ATTENDANCE DEBUG END ===');

    return res.status(200).json({
      success: true,
      message: 'Clocked out successfully',
      data: attendance // Return the updated attendance object
    });

  } catch (error) {
    console.error('❌ Error updating attendance (clock-out):', error);
    console.error('📄 Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


export const createManualAttendance = async (req, res) => {
  try {
    const { employeeId, date, timeIn, timeOut, status, latitude, longitude } = req.body; // Removed isLate, isOvertime from destructuring, as they'll be calculated
    
    console.log('=== Manual Attendance Creation ===');
    console.log('Request body:', req.body);
    console.log('Admin user:', req.user.id);
    
    // IMPORTANT: If you are getting "Access denied" errors for Administrators,
    // verify how your 'authorize' middleware (in authMiddleware.js) handles
    // role names. It might be case-sensitive ('admin' vs 'Administrator')
    // or not mapping certain roles correctly. Ensure the role passed to
    // authorize() in routes/attendance.js matches what's stored for the user
    // or modify the middleware to be more flexible.

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
    attendanceDate.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    
    const startOfDayQuery = new Date(attendanceDate);
    const endOfDayQuery = new Date(attendanceDate);
    endOfDayQuery.setHours(23, 59, 59, 999);
    
    // Check if attendance already exists for this date for this employee
    let existingAttendance = await Attendance.findOne({
      employee: employeeId, // Correctly use 'employee' field
      date: {
        $gte: startOfDayQuery,
        $lte: endOfDayQuery
      }
    });
    
    // Convert timeIn/timeOut strings to Date objects for calculations
    const parseTimeString = (dateObj, timeStr) => {
      if (!timeStr) return null;
      // Combine the date part from attendanceDate with the time part from timeStr
      // For manual entries, timeStr might be "HH:MM" or "HH:MM AM/PM"
      // Attempt to parse directly, then fallback to combining if necessary
      const fullDateTime = new Date(`${format(dateObj, 'yyyy-MM-dd')}T${timeStr}`);
      if (!isNaN(fullDateTime.getTime())) {
          return fullDateTime;
      }
      // Fallback for formats like "HH:MM AM/PM" not directly parsable with 'T'
      // This part might need more robust parsing if the time format is highly variable.
      const [hour, minute] = timeStr.split(':');
      const newDate = new Date(dateObj); // Clone the date to avoid mutation
      newDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
      return newDate;
    };

    const clockInDateTime = parseTimeString(attendanceDate, timeIn);
    const clockOutDateTime = parseTimeString(attendanceDate, timeOut); // Will be null if timeOut not provided

    // Calculate isLate based on clockInDateTime
    // Assuming 'Late' status for clock-ins before 7 AM or at/after 10 AM
    const calculatedIsLate = (clockInDateTime && (clockInDateTime.getHours() < 7 || clockInDateTime.getHours() >= 10));

    // Calculate duration in minutes for overtime calculation
    let durationMinutes = 0;
    if (clockInDateTime && clockOutDateTime && clockOutDateTime > clockInDateTime) {
      durationMinutes = Math.floor((clockOutDateTime - clockInDateTime) / 60000);
    }
    
    // Calculate isOvertime based on duration
    const STANDARD_WORK_HOURS_MINUTES = 8 * 60; 
    const calculatedIsOvertime = durationMinutes > STANDARD_WORK_HOURS_MINUTES;

    
    if (existingAttendance) {
      // Update existing attendance record
      console.log('Updating existing attendance record:', existingAttendance._id);
      
      existingAttendance.timeIn = timeIn; // Store original string
      existingAttendance.timeOut = timeOut; // Store original string
      existingAttendance.status = status;
      existingAttendance.isLate = calculatedIsLate; // Update isLate
      existingAttendance.isOvertime = calculatedIsOvertime; // Update isOvertime
      existingAttendance.duration = durationMinutes; 
      existingAttendance.latitude = latitude || existingAttendance.latitude; 
      existingAttendance.longitude = longitude || existingAttendance.longitude; 
      existingAttendance.recordedByAdmin = true; 
      existingAttendance.updatedAt = new Date();
      
      await existingAttendance.save();
      
      console.log('✅ Attendance record updated successfully (Manual)');
      
      return res.status(200).json({
        success: true,
        message: 'Attendance record updated successfully',
        data: existingAttendance
      });
      
    } else {
      // Create new attendance record
      console.log('Creating new attendance record for date (Manual):', date);
      
      const newAttendance = new Attendance({
        employee: employeeId, 
        date: attendanceDate, // Store normalized date
        timeIn: timeIn, // Store original string
        timeOut: timeOut, // Store original string
        status,
        isLate: calculatedIsLate, // Set isLate
        isOvertime: calculatedIsOvertime, // Set isOvertime
        duration: durationMinutes,
        latitude,
        longitude,
        recordedByAdmin: true,
      });
      
      await newAttendance.save();
      
      console.log('✅ New attendance record created successfully (Manual)');
      
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
      date: format(record.date, 'MMM dd, yyyy'), // Ensure date format is consistent
      timeIn: record.timeIn || null, // Ensure null if not set
      timeOut: record.timeOut || null, // Ensure null if not set
      status: record.status,
      isLate: record.isLate, // Include isLate from DB
      isOvertime: record.isOvertime, // Include isOvertime from DB
      duration: record.duration,
      notes: record.notes,
      latitude: record.latitude, // Include latitude
      longitude: record.longitude // Include longitude
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
        date: format(attendance.date, 'MMM dd, yyyy'), // Ensure date format is consistent
        timeIn: attendance.timeIn || null,
        timeOut: attendance.timeOut || null,
        status: attendance.status,
        isLate: attendance.isLate, // Include isLate
        isOvertime: attendance.isOvertime, // Include isOvertime
        duration: attendance.duration,
        latitude: attendance.latitude,
        longitude: attendance.longitude
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
      
      const employees = await User.find(employeeQuery).select('_id'); // Assuming 'User' is your employee model
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
      timeIn: record.timeIn || null,
      timeOut: record.timeOut || null,
      status: record.status,
      isLate: record.isLate, // Include isLate
      isOvertime: record.isOvertime, // Include isOvertime
      duration: record.duration,
      notes: record.notes,
      location: record.location,
      latitude: record.latitude,
      longitude: record.longitude
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

// For admin: Mark employee as absent, on vacation, sick, etc. (existing function)
export const updateAttendanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, latitude, longitude } = req.body; // Added lat/lon to update

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

    // Update latitude and longitude if provided (for manual edits by admin)
    if (latitude !== undefined) {
      attendance.latitude = latitude;
    }
    if (longitude !== undefined) {
      attendance.longitude = longitude;
    }
    
    // If marking as absent, clear timeIn/timeOut and flags
    if (status === 'Absent') {
      attendance.timeIn = null; // Set to null
      attendance.timeOut = null; // Set to null
      attendance.duration = 0;
      attendance.isLate = false;
      attendance.isOvertime = false;
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
  recordAttendance, // Clock-in
  updateAttendance,   // Clock-out (new)
  getEmployeeAttendance,
  getTodayAttendance,
  getAllAttendance,
  updateAttendanceStatus,
  createManualAttendance
};
