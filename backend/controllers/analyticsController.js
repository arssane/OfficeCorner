import Task from '../entities/Task.js';
import Employee from '../entities/Employee.js';
// If you have a Leave model, import it here
// import Leave from '../entities/Leave.js';

// Get dashboard analytics data
export const getDashboardAnalytics = async (req, res) => {
  try {
    // Count total employees
    const totalEmployees = await Employee.countDocuments();
    
    // Count tasks by status
    const tasksCompleted = await Task.countDocuments({ status: 'completed' });
    const tasksInProgress = await Task.countDocuments({ status: 'in-progress' });
    
    // For upcoming leaves, you would need a Leave model
    // This is a placeholder - you'll need to adjust based on your data model
    const upcomingLeaves = 0; // Replace with actual query if you have a Leave model
    
    // Return the analytics data
    res.status(200).json({
      employees: totalEmployees,
      tasksCompleted,
      tasksInProgress,
      upcomingLeaves
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ message: 'Failed to retrieve analytics data', error: error.message });
  }
};