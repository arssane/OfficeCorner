import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import employeeRoutes from './routes/employee.js';
import taskRoutes from './routes/task.js';
import attendanceRoutes from './routes/attendance.js';
import analyticsRoutes from './routes/analytics.js';
import eventRoutes from './routes/event.js'; // Import event routes
import Event from './entities/Event.js'; // Import Event model for testing purposes

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);  // Exit the process if DB connection fails
  });
