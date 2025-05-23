// routes/admin.js - Admin routes for employee approval
import express from 'express';
import User from '../entities/User.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes below this are protected and admin-only
router.use(protect);
router.use(authorize('Administrator'));

// @desc    Get all pending employees
// @route   GET /api/admin/pending-employees
// @access  Private/Admin
router.get('/pending-employees', async (req, res) => {
  try {
    const pendingEmployees = await User.find({ 
      role: 'Employee', 
      status: 'pending' 
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingEmployees.length,
      data: pendingEmployees
    });
  } catch (error) {
    console.error('Error fetching pending employees:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching pending employees' 
    });
  }
});

// @desc    Approve/Reject an employee (unified endpoint)
// @route   PUT /api/admin/approve-employee/:id
// @access  Private/Admin
router.put('/approve-employee/:id', async (req, res) => {
  try {
    const { status, reason } = req.body;
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    if (employee.role !== 'Employee') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only employees can be processed through this endpoint' 
      });
    }

    if (employee.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee is not in pending status' 
      });
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be "approved" or "rejected"' 
      });
    }

    console.log(`📝 Processing employee ${employee.name} with status: ${status}`);

    // Send real-time notification based on status
    if (global.io && global.connectedUsers) {
      const userId = employee._id.toString();
      const userSocketId = global.connectedUsers.get(userId);
      
      console.log(`🔍 Looking for user ${userId} in connected users:`, Array.from(global.connectedUsers.keys()));
      
      if (userSocketId) {
        let notificationData;
        
        if (status === 'approved') {
          notificationData = {
            type: 'approval',
            title: 'Registration Approved!',
            message: '🎉 Congratulations! Your employee registration has been approved. You can now access all employee features and dashboard.',
            timestamp: new Date().toISOString(),
            userId: userId
          };
        } else if (status === 'rejected') {
          notificationData = {
            type: 'rejection',
            title: 'Registration Rejected',
            message: `❌ Your employee registration has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact administrator for more information.'}`,
            timestamp: new Date().toISOString(),
            userId: userId
          };
        }
        
        // Send to specific user socket
        global.io.to(userSocketId).emit('registrationUpdate', notificationData);
        console.log(`📧 ${status} notification sent to employee ${employee.name} (Socket: ${userSocketId})`);
        
        // Also emit to user's room as backup
        global.io.to(userId).emit('registrationUpdate', notificationData);
        console.log(`📧 Backup notification sent to room ${userId}`);
        
      } else {
        console.log(`📱 Employee ${employee.name} (${userId}) is not currently online`);
        console.log(`🔍 Connected users: ${Array.from(global.connectedUsers.entries())}`);
      }
    } else {
      console.log('❌ Socket.io not available or no connected users');
    }

    // Update employee status
    employee.status = status;
    
    if (status === 'approved') {
      employee.approvedAt = new Date();
      employee.approvedBy = req.user.id;
    } else if (status === 'rejected') {
      employee.rejectedAt = new Date();
      employee.rejectedBy = req.user.id;
      if (reason) {
        employee.rejectionReason = reason;
      }
    }

    await employee.save();

    const responseData = {
      id: employee._id,
      username: employee.username,
      email: employee.email,
      name: employee.name,
      status: employee.status
    };

    if (status === 'approved') {
      responseData.approvedAt = employee.approvedAt;
    } else if (status === 'rejected') {
      responseData.rejectedAt = employee.rejectedAt;
      responseData.rejectionReason = employee.rejectionReason;
    }

    res.json({
      success: true,
      message: `Employee ${status} successfully`,
      data: responseData
    });

  } catch (error) {
    console.error(`Error processing employee:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while processing employee' 
    });
  }
});

// Lookup user for pending login scenarios
router.post('/lookup-user', async (req, res) => {
  try {
    const { email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

    // Find user by email and role
    const user = await User.findOne({ email, role });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data (without sensitive information like password)
    const userData = {
      id: user._id,
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('User lookup error:', error);
    res.status(500).json({ message: 'Server error during user lookup' });
  }
});

// Lookup Google user for pending login scenarios
router.post('/google-lookup', async (req, res) => {
  try {
    const { token, role } = req.body;
    
    if (!token || !role) {
      return res.status(400).json({ message: 'Token and role are required' });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;

    // Find user by email and role
    const user = await User.findOne({ email, role });
    
    if (!user) {
      return res.status(404).json({ message: 'Google user not found' });
    }

    // Return user data
    const userData = {
      id: user._id,
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Google user lookup error:', error);
    res.status(500).json({ message: 'Server error during Google user lookup' });
  }
});

// @desc    Get all employees with their status
// @route   GET /api/admin/employees
// @access  Private/Admin
router.get('/employee', async (req, res) => {
  try {
    const { status } = req.query;
    let filter = { role: 'Employee' };
    
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const employees = await User.find(filter)
      .select('-password')
      .populate('approvedBy', 'username email')
      .populate('rejectedBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching employees' 
    });
  }
});

export default router;