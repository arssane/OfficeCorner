// controllers/taskController.js
import Task from '../entities/Task.js';

export const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate('assignedTo', 'username name');
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error in getAllTasks:', error);
    res.status(500).json({ message: 'Failed to retrieve tasks', error: error.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
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
    const employeeTasks = await Task.find({ assignedTo: req.params.employeeId }).populate('assignedTo', 'username name');
    res.status(200).json(employeeTasks);
  } catch (error) {
    console.error('Error in getTasksByEmployee:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error in updateTask:', error);
    res.status(500).json({ message: error.message });
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
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error in createTask:', error);
    res.status(400).json({ message: error.message });
  }
};