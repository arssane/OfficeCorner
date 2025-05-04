import express from 'express';
import { getAllTasks, getTaskById, getTasksByEmployee, createTask, updateTask, deleteTask } from '../controllers/taskController.js';
import { protect, generateToken, authorize } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import Task from '../entities/Task.js';

const router = express.Router();

// Apply authentication middleware to all task routes
router.use(protect);

// Public task routes (for authenticated users)
router.get('/admin', adminMiddleware, getAllTasks);
router.get('/employee/:employeeId', getTasksByEmployee);

// New route to get tasks assigned to the authenticated user
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id }); // assuming `assignedTo` holds user ID
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks for user:', error);
    res.status(500).json({ message: 'Failed to retrieve tasks', error: error.message });
  }
});

// Admin-only task routes
router.post('/', createTask);
router.get('/:id', getTaskById);
router.put('/admin/:id', adminMiddleware, updateTask);
router.delete('/admin/:id', adminMiddleware, deleteTask);

export default router;