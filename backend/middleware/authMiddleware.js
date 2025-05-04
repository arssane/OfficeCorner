// middleware/authMiddleware.js - Authentication middleware
import jwt from 'jsonwebtoken';
import User from '../entities/User.js';
import Employee from '../entities/Employee.js';

export const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token and exclude password
      req.user = await Employee.findById(decoded.id).select('-password');

      if (!req.user) {
        // Try to find in User model if not found in Employee
        req.user = await User.findById(decoded.id).select('-password');
        
        if (!req.user) {
          return res.status(401).json({ message: 'Not authorized, user not found' });
        }
      }

      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, invalid token' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Role-based access control middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Role ${req.user.role} is not authorized to access this resource`
      });
    }
    
    next();
  };
};

export default{
  protect,
  generateToken,
  authorize
};
