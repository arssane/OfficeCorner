// routes/employeeRoutes.js
import express from 'express';
import { 
  getAllEmployees, 
  getEmployeeById, 
  addEmployee, 
  updateEmployee, 
  deleteEmployee,
  registerEmployee,
  loginEmployee,
  googleEmployeeSignIn,
  getEmployeeProfile
} from '../controllers/employeeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerEmployee);
router.post('/login', loginEmployee);
router.post('/google', googleEmployeeSignIn);

// Protected routes
router.use(protect); // All routes below this middleware require authentication
router.get('/profile', getEmployeeProfile);

// Admin-only routes
router.route('/')
  .get(authorize('Administrator'), getAllEmployees)
  .post(authorize('Administrator'), addEmployee);

router.route('/:id')
  .get(getEmployeeById) // Both admin and the employee can view their own data
  .put(updateEmployee) // Both admin and the employee can update their own data
  .delete(authorize('Administrator'), deleteEmployee);

export default router;