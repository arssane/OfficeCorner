// controllers/userController.js - User controller
import User from '../entities/User.js';

// Get all users (admin only)
export const getAllUsers = async (req, res, next) => {
  try {
    // Check if requester is admin
    if (req.user.role !== 'Administrator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// Get user by ID
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Only administrators can view other user profiles
    if (req.user.role !== 'Administrator' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const getCurrentUsername = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('username');
    res.json({ username: user.username });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Update user
export const updateUser = async (req, res, next) => {
  try {
    // Only allow users to update their own profile unless they're an admin
    if (req.user.role !== 'Administrator' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { username, email } = req.body;
    
    // Check if username or email already exists
    if (username || email) {
      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: req.params.id } },
          { $or: [
            { username: username || '' },
            { email: email || '' }
          ]}
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Username or email already in use' 
        });
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    // Only allow users to delete their own account unless they're an admin
    if (req.user.role !== 'Administrator' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};