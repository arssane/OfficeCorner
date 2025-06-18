// routes/department.js
import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignEmployeesToDepartment,
  removeEmployeesFromDepartment
} from '../controllers/departmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get all departments - accessible by all authenticated users
router.get('/', getAllDepartments);

// Get single department by ID - accessible by all authenticated users
router.get('/:id', getDepartmentById);

// Apply admin middleware for create, update, delete operations
router.use(adminMiddleware);

// Create new department - admin only
router.post('/', createDepartment);

// Update department - admin only
router.put('/:id', updateDepartment);

// Delete department - admin only
router.delete('/:id', deleteDepartment);

// Assign employees to department - admin only
router.post('/:id/assign-employees', assignEmployeesToDepartment);

// Remove employees from department - admin only
router.post('/:id/remove-employees', removeEmployeesFromDepartment);

export default router;