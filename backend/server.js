// server.js - No changes needed here, as department routes are already in place
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import employeeRoutes from './routes/employee.js';
import taskRoutes from './routes/task.js';
import attendanceRoutes from './routes/attendance.js';
import analyticsRoutes from './routes/analytics.js';
import eventRoutes from './routes/event.js';
import departmentRoutes from './routes/department.js'; // Already imported
import Event from './entities/Event.js';
import User from './entities/User.js';
import { Server } from 'socket.io';
import http from 'http';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development'
      ? ['http://localhost:5173', 'http://127.0.0.1:5173']
      : [process.env.FRONTEND_URL],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store connected users
const connectedUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Store user connection with their ID
  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`👤 User ${userId} joined with socket ${socket.id}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove user from connected users
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`👤 User ${userId} disconnected`);
        break;
      }
    }
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Make io and connectedUsers available globally
global.io = io;
global.connectedUsers = connectedUsers;

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'development'
  ? ['http://localhost:5173', 'http://127.0.0.1:5173']
  : [process.env.FRONTEND_URL];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function to seed the default administrator
const seedAdministrator = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'saniya@admin.com' });
    
    if (!existingAdmin) {
      // Create the default administrator
      const admin = await User.create({
        username: 'saniya_admin',
        email: 'saniya@admin.com',
        password: 'saniya123', // Will be hashed by pre-save hook
        role: 'Administrator',
        name: 'Saniya Administrator'
      });
      
      console.log('✅ Default administrator account created successfully');
      console.log('📧 Email: saniya@admin.com');
      console.log('🔑 Password: saniya123');
    } else {
      console.log('✅ Administrator account already exists');
    }
  } catch (error) {
    console.error('❌ Error seeding administrator:', error);
  }
};

// Basic health check route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/department', departmentRoutes);

// Test event-related endpoint
app.get('/api/test/events', async (req, res) => {
  console.log('Test events endpoint called');
  try {
    const events = await Event.find();
    console.log('Test endpoint found events:', events.length);
    res.status(200).json({
      message: 'Test endpoint successful',
      eventCount: events.length,
      events: events
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      message: 'Error in test endpoint',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test socket notification endpoint (for testing purposes)
app.post('/api/test/notification', (req, res) => {
  const { userId, message } = req.body;
  
  if (global.io && global.connectedUsers) {
    const userSocketId = global.connectedUsers.get(userId);
    if (userSocketId) {
      global.io.to(userSocketId).emit('registrationUpdate', {
        type: 'approval',
        title: 'Test Notification',
        message: message || 'This is a test notification',
        timestamp: new Date().toISOString()
      });
      res.json({ message: 'Test notification sent successfully' });
    } else {
      res.status(404).json({ message: 'User not connected' });
    }
  } else {
    res.status(500).json({ message: 'Socket.IO not initialized' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Database connection and server startup
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔗 Connected to MongoDB');
    
    // Seed the default administrator after database connection
    await seedAdministrator();
    
    // Use server.listen instead of app.listen to support Socket.IO
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log('🔌 Socket.IO initialized for real-time notifications');
      console.log('📝 Default Admin Credentials:');
      console.log('   Email: saniya@admin.com');
      console.log('   Password: saniya123');
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });