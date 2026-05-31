import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { connectDB } from './config/dbConnection.js';
import { initializeSocket } from './config/socket.config.js';
import rideRouter from './router/ride.router.js';
import customerRouter from './router/customer.router.js';
import quickrideRouter from './router/quickride.router.js';
import vehicleRouter from './router/vehicle.router.js';
import userRouter from './router/user.router.js';
import appContentRouter from './router/appContent.router.js';
import { declineTimedOutRequests } from './service/request.service.js';

// Import models to register schemas (must be done before any database operations)
import './models/user.model.js';
import './models/driver.model.js';
import './models/vehicle.model.js';
import './models/customer.model.js';
import './models/rides.js';
import './models/requests.model.js';
import './models/appContent.model.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io accessible in routes
app.set('io', io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads folder
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api', rideRouter);
app.use('/api/customer', customerRouter);
app.use('/api/quickride', quickrideRouter);
app.use('/api/vehicles', vehicleRouter);
app.use('/api/user', userRouter);
app.use('/api/app-content', appContentRouter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    socketIO: 'Connected'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to BHY User Backend API',
    version: '2.0.0',
    features: ['REST API', 'WebSocket Support', 'Real-time Ride Booking']
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Set up request timeout checker (runs every 1 minute)
const REQUEST_TIMEOUT_MINUTES = parseInt(process.env.REQUEST_TIMEOUT_MINUTES) || 5;
const TIMEOUT_CHECK_INTERVAL = parseInt(process.env.TIMEOUT_CHECK_INTERVAL) || 60000; // 1 minute in ms

setInterval(async () => {
  try {
    await declineTimedOutRequests(REQUEST_TIMEOUT_MINUTES);
  } catch (error) {
    console.error('Failed to decline timed-out requests:', error.message);
  }
}, TIMEOUT_CHECK_INTERVAL);

// Run once on startup to clear any existing timed-out requests
declineTimedOutRequests(REQUEST_TIMEOUT_MINUTES)
  .then(result => {
    if (result.declinedCount > 0) {
      console.log(`✓ Cleared ${result.declinedCount} timed-out requests on startup`);
    }
  })
  .catch(err => console.error('Failed to clear timed-out requests on startup:', err.message));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✓ Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`✓ WebSocket server initialized`);
  console.log(`✓ API endpoint: http://localhost:${PORT}/api`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Request timeout: ${REQUEST_TIMEOUT_MINUTES} minutes (checks every ${TIMEOUT_CHECK_INTERVAL/1000}s)`);
});

export { io, app, server };
