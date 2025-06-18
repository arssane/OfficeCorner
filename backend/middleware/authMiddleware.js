// middleware/authMiddleware.js - Fixed Authentication middleware
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
      
      console.log('Token received:', token ? 'Yes' : 'No'); // Debug log

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded); // Debug log

      // Get user from token and exclude password
      // Try User model first (this is likely where your admin users are)
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        // Try Employee model as fallback
        req.user = await Employee.findById(decoded.id).select('-password');
        
        if (!req.user) {
          console.log('User not found in either User or Employee models'); // Debug log
          return res.status(401).json({ 
            message: 'Not authorized, user not found',
            statusCode: 'USER_NOT_FOUND'
          });
        }
      }

      console.log('User found:', req.user.username, 'Role:', req.user.role); // Debug log

      // Check user status (skip status check for admin users to avoid lockout)
      if (req.user.role !== 'Administrator' && req.user.role !== 'admin') {
        if (req.user.status === 'rejected') {
          return res.status(403).json({ 
            message: 'Your account has been rejected. Please contact the administrator.',
            statusCode: 'ACCOUNT_REJECTED'
          });
        }

        if (req.user.status === 'pending') {
          return res.status(403).json({ 
            message: 'Your account is pending approval. Please wait for administrator approval.',
            statusCode: 'ACCOUNT_PENDING'
          });
        }

        if (req.user.status !== 'approved') {
          return res.status(403).json({ 
            message: 'Your account is not active. Please contact the administrator.',
            statusCode: 'ACCOUNT_INACTIVE'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired. Please log in again.',
          statusCode: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({ 
        message: 'Not authorized, invalid token',
        statusCode: 'INVALID_TOKEN'
      });
    }
  } else {
    // No token provided
    return res.status(401).json({ 
      message: 'Authentication token not found. Please log in again.',
      statusCode: 'NO_TOKEN'
    });
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

export default {
  protect,
  generateToken,
  authorize
};