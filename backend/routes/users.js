// routes/users.js - User routes
import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser,
  getCurrentUsername 
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes below this are protected
router.use(protect);

router.get('/current/username', getCurrentUsername);

// Routes for all authenticated users
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

// Admin-only routes
router.get('/', authorize('Administrator'), getAllUsers);

export default router;