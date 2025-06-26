// task.js
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
// This route is now explicitly for 'my-tasks' if you want a separate endpoint for it.
router.get('/my-tasks', async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id })
      .populate('assignedTo', 'username name email');
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks for user:', error);
    res.status(500).json({ message: 'Failed to retrieve tasks', error: error.message });
  }
});

// DEFAULT route to get tasks based on user role
// - Administrators get all tasks
// - Regular users get tasks assigned to them
router.get('/', async (req, res) => { // This is the route the frontend calls by default
  try {
    if (req.user.role === 'Administrator') {
      const tasks = await Task.find().populate('assignedTo', 'username name email');
      return res.status(200).json(tasks);
    } else {
      const tasks = await Task.find({ assignedTo: req.user.id })
        .populate('assignedTo', 'username name email');
      return res.status(200).json(tasks);
    }
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    res.status(500).json({ message: 'Failed to retrieve tasks', error: error.message });
  }
});

// Admin-only task routes
router.post('/', createTask); // Note: You might want to consider adding adminMiddleware here too if only admins can create tasks
router.put('/admin/:id', adminMiddleware, updateTask);
router.delete('/admin/:id', adminMiddleware, deleteTask);

// IMPORTANT: Put specific routes BEFORE parameterized routes
// Add the missing PUT route for regular task updates
router.put('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;

    // Check if the task exists and if the user is authorized to update it
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Allow update if user is admin or task is assigned to them
    if (req.user.role === 'Administrator' || task.assignedTo.toString() === req.user.id) {
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
      ).populate('assignedTo', 'username name email');

      console.log('Task updated successfully:', updatedTask);
      res.status(200).json(updatedTask);
    } else {
      res.status(403).json({ message: 'Not authorized to update this task' });
    }
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      message: 'Failed to update task',
      error: error.message
    });
  }
});

// Regular user routes for PATCH (assuming a PATCH route was intended here)
router.patch('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (req.user.role === 'Administrator' || task.assignedTo.toString() === req.user.id) {
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
      ).populate('assignedTo', 'username name email');

      console.log('Task patched successfully:', updatedTask);
      res.status(200).json(updatedTask);

    } else {
      res.status(403).json({ message: 'Not authorized to update this task' });
    }

  } catch (error) {
    console.error('Error patching task:', error);
    res.status(500).json({
      message: 'Failed to update task',
      error: error.message
    });
  }
});

// Regular user routes for DELETE
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (req.user.role === 'Administrator' || task.assignedTo.toString() === req.user.id) {
      const deletedTask = await Task.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } else {
      res.status(403).json({ message: 'Not authorized to delete this task' });
    }
  } catch (error) {
    console.error('Error in deleteTask route:', error);
    res.status(500).json({ message: error.message });
  }
});


router.get('/:id', getTaskById);


export default router;