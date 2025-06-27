// controllers/taskController.js
import Task from '../entities/Task.js';

export const getAllTasks = async (req, res) => {
  try {
    // Populate assignedTo and include file URLs
    const tasks = await Task.find().populate('assignedTo', 'username name');
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error in getAllTasks:', error);
    res.status(500).json({ message: 'Failed to retrieve tasks', error: error.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
    // Populate assignedTo and include file URLs
    const task = await Task.findById(req.params.id).populate('assignedTo', 'username name');
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
    const employeeTasks = await Task.find({ assignedTo: req.params.employeeId }).populate('assignedTo', 'username name');
    res.status(200).json(employeeTasks);
  } catch (error) {
    console.error('Error in getTasksByEmployee:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // First check if task exists
    const existingTask = await Task.findById(taskId);
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
    ).populate('assignedTo', 'username name');
    
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found after update' });
    }
    
    console.log('Task updated successfully:', updatedTask);
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
    
    // Populate the assignedTo field for consistent response
    const populatedTask = await Task.findById(savedTask._id).populate('assignedTo', 'username name');
    
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
