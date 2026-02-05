import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { connectDB } from './config/dbConnection.js';
import { initializeSocket } from './config/socket.config.js';
import rideRouter from './router/ride.router.js';
import customerRouter from './router/customer.router.js';
import quickrideRouter from './router/quickride.router.js';

// Import models to register schemas (must be done before any database operations)
import './models/user.model.js';
import './models/driver.model.js';
import './models/vehicle.model.js';
import './models/customer.model.js';
import './models/rides.js';
import './models/requests.model.js';

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

// API Routes
app.use('/api', rideRouter);
app.use('/api/customer', customerRouter);
app.use('/api/quickride', quickrideRouter);

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

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✓ Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`✓ WebSocket server initialized`);
  console.log(`✓ API endpoint: http://localhost:${PORT}/api`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
});

export { io, app, server };
