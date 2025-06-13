import Task from '../entities/Task.js';
import Event from '../entities/Event.js';
import User from '../entities/User.js';

/**
 * @desc    Get dashboard analytics data
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
export const getDashboardAnalytics = async (req, res) => {
  try {
    const currentDate = new Date();
    // Format current date as string to match the Event schema
    const currentDateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Debug logging to see what's in the database
    console.log('=== ANALYTICS DEBUG START ===');
    
    const allEmployeeUsers = await User.find({ role: 'Employee' });
    console.log('All users with Employee role:', allEmployeeUsers.length);
    console.log('Employee user statuses:', allEmployeeUsers.map(user => ({ 
      id: user._id, 
      status: user.status, 
      role: user.role,
      name: user.name || user.username || user.email 
    })));
    
    // Execute all count queries in parallel for better performance
    const [
      totalEmployees,
      totalEmployeesApproved,
      tasksCompleted,
      tasksInProgress,
      upcomingEvents,
      totalTasks,
      pendingEmployees
    ] = await Promise.all([
      User.countDocuments({ role: 'Employee' }),
      User.countDocuments({ role: 'Employee', status: 'approved' }),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'in-progress' }),
      // Updated to handle string date comparison
      Event.countDocuments({ date: { $gte: currentDateString } }),
      Task.countDocuments(),
      User.countDocuments({ role: 'Employee', status: 'pending' })
    ]);

    console.log('Count results:');
    console.log('- Total employees:', totalEmployees);
    console.log('- Approved employees:', totalEmployeesApproved);
    console.log('- Tasks completed:', tasksCompleted);
    console.log('- Tasks in progress:', tasksInProgress);
    console.log('- Upcoming events:', upcomingEvents);
    console.log('- Pending employees:', pendingEmployees);
    console.log('- Current date string for comparison:', currentDateString);
    
    // Use total employees count (approved + pending + any other status)
    let employeeCount = totalEmployees;
    
    console.log('Final employee count used:', employeeCount);
    console.log('=== ANALYTICS DEBUG END ===');

    // Calculate completion rate with safeguard against division by zero
    const completionRate = totalTasks > 0 
      ? Math.round((tasksCompleted / totalTasks) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        employees: employeeCount,
        tasksCompleted,
        tasksInProgress,
        upcomingEvents,
        totalTasks,
        pendingEmployees,
        completionRate,
        lastUpdated: new Date().toISOString(),
        // Include debug info in development
        debug: process.env.NODE_ENV === 'development' ? {
          totalEmployees,
          totalEmployeesApproved,
          currentDateString
        } : undefined
      }
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve analytics data', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get detailed analytics for admin dashboard
 * @route   GET /api/analytics/detailed
 * @access  Private (Admin)
 */
export const getDetailedAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Execute all analytics queries in parallel
    const [
      tasksByStatus,
      employeesByDepartment,
      eventsByMonth,
      recentTasks
    ] = await Promise.all([
      Task.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { role: 'Employee' } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),
      Event.aggregate([
        // Updated to handle string dates - this assumes YYYY-MM-DD format
        { 
          $addFields: {
            dateAsDate: { $dateFromString: { dateString: '$date' } }
          }
        },
        { 
          $group: {
            _id: {
              year: { $year: '$dateAsDate' },
              month: { $month: '$dateAsDate' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Task.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        tasksByStatus,
        employeesByDepartment,
        eventsByMonth,
        recentTasks,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve detailed analytics', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};