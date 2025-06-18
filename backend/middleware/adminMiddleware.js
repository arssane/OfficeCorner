// middleware/adminMiddleware.js
export const adminMiddleware = (req, res, next) => {
    console.log('Admin middleware - User role:', req.user?.role); // Debug log
    
    if (!req.user) {
        return res.status(401).json({ 
            message: 'Authentication required. Please log in again.',
            statusCode: 'NOT_AUTHENTICATED'
        });
    }
    
    // Check for both 'admin' and 'Administrator' roles to handle different naming conventions
    const adminRoles = ['admin', 'Administrator'];
    
    if (!adminRoles.includes(req.user.role)) {
        return res.status(403).json({ 
            message: `Access denied. Admin privileges required. Current role: ${req.user.role}`,
            statusCode: 'INSUFFICIENT_PRIVILEGES'
        });
    }
    
    next();
};