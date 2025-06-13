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
router.put('/admin/:id', adminMiddleware, updateTask);
router.delete('/admin/:id', adminMiddleware, deleteTask);

// IMPORTANT: Put specific routes BEFORE parameterized routes
// Add the missing PUT route for regular task updates
router.put('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;
    
    console.log('Updating task:', taskId, 'with data:', updateData);
    
    // Find the task first
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check permissions - user can update their own tasks or admin can update any
    const canUpdate = req.user.role === 'Administrator' || 
                     existingTask.assignedTo.toString() === req.user.id;
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }
    
    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(
      taskId, 
      {
        ...updateData,
        updatedAt: new Date()
      }, 
      { 
        new: true, // Return the updated document
        runValidators: true // Run mongoose validation
      }
    );
    
    console.log('Task updated successfully:', updatedTask);
    res.status(200).json(updatedTask);
    
  } catch (error) {
    console.error('Error updating task:', error);
    
    // Handle specific mongoose errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID format' });
    }
    
    res.status(500).json({ 
      message: 'Failed to update task', 
      error: error.message 
    });
  }
});

// Add PATCH route as alternative for partial updates
router.patch('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;
    
    console.log('Patching task:', taskId, 'with data:', updateData);
    
    // Find the task first
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check permissions
    const canUpdate = req.user.role === 'Administrator' || 
                     existingTask.assignedTo.toString() === req.user.id;
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }
    
    // Update only the provided fields
    const updatedTask = await Task.findByIdAndUpdate(
      taskId, 
      {
        ...updateData,
        updatedAt: new Date()
      }, 
      { 
        new: true,
        runValidators: true
      }
    );
    
    console.log('Task patched successfully:', updatedTask);
    res.status(200).json(updatedTask);
    
  } catch (error) {
    console.error('Error patching task:', error);
    res.status(500).json({ 
      message: 'Failed to update task', 
      error: error.message 
    });
  }
});

// Regular user routes
router.delete('/:id', async (req, res) => {
  try {
    // Check if the task belongs to the authenticated user
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Allow deletion if user is admin or task is assigned to them
    if (req.user.role === 'Administrator' || task.assignedTo.toString() === req.user.id) {
      const deletedTask = await Task.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } else {
      res.status(403).json({ message: 'Not authorized to delete this task' });
    }
  } catch (error) {
    console.error('Error in deleteTask:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', getTaskById);

export default router;