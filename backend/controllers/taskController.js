// controllers/taskController.js
import Task from '../entities/Task.js';
import { sendTaskAssignmentEmail } from '../services/emailService.js'; // Import the new email service function
import User from '../entities/User.js'; // Assuming you have a User model to fetch user details

export const getAllTasks = async (req, res) => {
  try {
    // Populate assignedTo and include file URLs
    const tasks = await Task.find().populate('assignedTo', 'username name email'); // Populate email too
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error in getAllTasks:', error);
    res.status(500).json({ message: 'Failed to retrieve tasks', error: error.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
    // Populate assignedTo and include file URLs
    const task = await Task.findById(req.params.id).populate('assignedTo', 'username name email'); // Populate email too
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json(task);
  } catch (error) {
    console.error('Error in getTaskById:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getTasksByEmployee = async (req, res) => {
  try {
    // Populate assignedTo and include file URLs
    const employeeTasks = await Task.find({ assignedTo: req.params.employeeId }).populate('assignedTo', 'username name email'); // Populate email too
    res.status(200).json(employeeTasks);
  } catch (error) {
    console.error('Error in getTasksByEmployee:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // First check if task exists and get its current state
    const existingTask = await Task.findById(taskId).populate('assignedTo', 'username name email'); // Populate assignedTo to get email
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Prepare update data including file URLs
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // Remove undefined fields to prevent overwriting with undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    console.log('Updating task with data:', updateData);
    
    const updatedTask = await Task.findByIdAndUpdate(
      taskId, 
      updateData, 
      { 
        new: true,
        runValidators: true
      }
    ).populate('assignedTo', 'username name email'); // Populate assignedTo in the updated task too
    
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found after update' });
    }
    
    console.log('Task updated successfully:', updatedTask);

    // Check if the assignedTo field has changed or if a task was assigned for the first time
    const oldAssignedToId = existingTask.assignedTo ? existingTask.assignedTo._id.toString() : null;
    const newAssignedToId = updatedTask.assignedTo ? updatedTask.assignedTo._id.toString() : null;

    if (newAssignedToId && newAssignedToId !== oldAssignedToId) {
      // Task was assigned to a new employee or assigned for the first time
      const assignedEmployee = updatedTask.assignedTo;
      if (assignedEmployee && assignedEmployee.email) {
        const taskDetails = {
          title: updatedTask.title,
          description: updatedTask.description,
          deadline: updatedTask.deadline ? new Date(updatedTask.deadline).toLocaleDateString() : 'N/A',
          priority: updatedTask.priority,
          status: updatedTask.status,
          assignedFile: updatedTask.assignedFile,
          assignedUserName: assignedEmployee.name || assignedEmployee.username,
        };
        // Construct a site link if FRONTEND_URL is available
        const siteLink = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/tasks/${updatedTask._id}` : null;
        sendTaskAssignmentEmail(assignedEmployee.email, taskDetails, siteLink);
      }
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error in updateTask:', error);
    res.status(500).json({ 
      message: 'Failed to update task', 
      error: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteTask:', error);
    res.status(500).json({ message: error.message });
  }
};

export const createTask = async (req, res) => {
  try {
    // Add createdAt and updatedAt timestamps
    // Also include assignedFile if present in req.body
    const taskData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const newTask = new Task(taskData);
    const savedTask = await newTask.save();
    
    // Populate the assignedTo field for consistent response and to get email
    const populatedTask = await Task.findById(savedTask._id).populate('assignedTo', 'username name email');
    
    // Send email notification if task is assigned to an employee
    if (populatedTask.assignedTo && populatedTask.assignedTo.email) {
      const assignedEmployee = populatedTask.assignedTo;
      const taskDetails = {
        title: populatedTask.title,
        description: populatedTask.description,
        deadline: populatedTask.deadline ? new Date(populatedTask.deadline).toLocaleDateString() : 'N/A',
        priority: populatedTask.priority,
        status: populatedTask.status,
        assignedFile: populatedTask.assignedFile,
        assignedUserName: assignedEmployee.name || assignedEmployee.username,
      };
      // Construct a site link if FRONTEND_URL is available
      const siteLink = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/tasks/${populatedTask._id}` : null;
      sendTaskAssignmentEmail(assignedEmployee.email, taskDetails, siteLink);
    }
    
    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error in createTask:', error);
    res.status(400).json({ 
      message: 'Failed to create task', 
      error: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
};
