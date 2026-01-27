# BHY User Backend

A comprehensive Node.js/Express backend API with MongoDB for ride booking and user management, featuring real-time WebSocket communication.

## 🚀 Features

### Core Features
- **Real-time Ride Booking System** with WebSocket (Socket.IO)
- **Two Ride Types**: Quick Rides (<150km) and Outstation (>=150km)
- **Location-based Driver Matching** using geospatial queries
- **Online/Offline Status Management** for drivers
- **Dynamic Fare Updates** in real-time
- **Automatic Timeouts** (3 min for Quick Rides, 5 min for Outstation)
- **Request Management** with accept/decline workflow
- **Scalable Architecture** supporting 1000+ concurrent users

### Additional Features
- User registration and authentication
- JWT token-based authorization
- Role-based access control
- Password hashing with bcrypt
- Input validation
- Error handling middleware
- MongoDB integration with Mongoose

## 📁 Project Structure

```
bhyuserbackend/
├── config/
│   ├── dbConnection.js          # MongoDB connection
│   ├── socket.config.js         # WebSocket configuration & handlers
│   ├── jwt.config.js            # JWT configuration
│   └── notification.config.js   # Notification settings
├── controllers/
│   ├── customer.controller.js   # Customer endpoints
│   ├── ride.controller.js       # Ride booking endpoints
│   └── request.controller.js    # Request management endpoints
├── middleware/
│   ├── auth.middleware.js       # Authentication & authorization
│   └── logger.js                # Request logger
├── models/
│   ├── user.model.js            # User schema with location
│   ├── customer.model.js        # Customer schema
│   ├── driver.model.js          # Driver schema
│   ├── vehicle.model.js         # Vehicle schema
│   ├── rides.js                 # Ride schema
│   └── requests.model.js        # Request schema
├── router/
│   ├── customer.router.js       # Customer routes
│   └── ride.router.js           # Ride & request routes
├── service/
│   ├── ride.service.js          # Ride business logic
│   ├── request.service.js       # Request business logic
│   └── otp.js                   # OTP utilities
├── utils/
│   └── responseHelper.js        # Response formatting utilities
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore file
├── package.json                 # Project dependencies
├── server.js                    # Application entry point
├── QUICK_START.md               # Quick start guide
├── RIDE_BOOKING_GUIDE.md        # Complete documentation
├── client-example.js            # WebSocket client example
├── test-flow.js                 # Automated test script
├── postman-collection.json      # Postman API collection
└── README.md                    # This file
```

## ⚡ Quick Installation

### Windows
```bash
setup.bat
```

### Linux/Mac
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Installation
```bash
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```


## 🔧 Configuration

Edit `.env` file with your settings:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/bhyuserbackend

# JWT
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=7d

# Ride Configuration
OUTSTATION_DISTANCE_KM=150
QUICKRIDE_TIMEOUT_MS=180000      # 3 minutes
OUTSTATION_TIMEOUT_MS=300000     # 5 minutes
QUICKRIDE_SEARCH_RADIUS_KM=10
MAX_DRIVERS_TO_NOTIFY=20

# CORS
CORS_ORIGIN=http://localhost:3000
SOCKET_CORS_ORIGIN=http://localhost:3000
```

## 🚀 Running the Application

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Server runs at: `http://localhost:5000`

## 📚 API Documentation

### Health Check
- `GET /health` - Check server status

### Ride Endpoints
- `POST /api/rides` - Create a new ride
- `GET /api/rides/:rideId` - Get ride by ID
- `GET /api/rides` - Get all rides (with filters)
- `GET /api/rides/customer/:customerId` - Get customer rides
- `GET /api/rides/driver/:driverId` - Get driver rides
- `PUT /api/rides/:rideId/fare` - Update ride fare
- `PUT /api/rides/:rideId/start` - Start ride
- `PUT /api/rides/:rideId/complete` - Complete ride
- `PUT /api/rides/:rideId/cancel` - Cancel ride

### Request Endpoints
- `POST /api/requests` - Create a request
- `GET /api/requests/ride/:rideId` - Get ride requests
- `PUT /api/requests/:requestId/approve` - Approve request
- `PUT /api/requests/:requestId/decline` - Decline request

### User/Location Endpoints
- `PUT /api/users/:userId/status` - Update online status
- `PUT /api/users/:userId/location` - Update location
- `GET /api/users/nearby` - Find nearby drivers

**For complete API documentation, see:** [RIDE_BOOKING_GUIDE.md](RIDE_BOOKING_GUIDE.md)

## 🔌 WebSocket Events

### Client Events (Emit)
```javascript
// Connect
socket.emit('user:connect', { userId, userType });
socket.emit('customer:connect', { customerId });

// Ride management
socket.emit('ride:create', { ...rideData });
socket.emit('ride:update-fare', { rideId, newFare });
socket.emit('ride:cancel', { rideId, customerId });

// Request management
socket.emit('request:create', { ...requestData });
socket.emit('request:accept', { requestId, rideId });
socket.emit('request:decline', { requestId, rideId, reason });
```

### Server Events (Listen)
```javascript
// Ride notifications
socket.on('ride:created', ({ ride, nearbyDrivers, timeout }));
socket.on('ride:new-request', ({ ride, timeout }));
socket.on('ride:started', ({ rideId, status, message }));
socket.on('ride:completed', ({ rideId, status, message }));

// Request notifications
socket.on('request:new', ({ request, message }));
socket.on('request:accepted', ({ request, message, rideId }));
socket.on('request:declined', ({ requestId, rideId, reason }));
```

**For complete WebSocket documentation and client examples, see:** [client-example.js](client-example.js)

## 🧪 Testing

### Import Postman Collection
Import `postman-collection.json` into Postman for REST API testing.

### Run Automated Tests
```bash
node test-flow.js
```

### Manual Testing
1. Start the server: `npm run dev`
2. Open Postman and import the collection
3. Test WebSocket using the client example

## 📖 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get started quickly
- **[RIDE_BOOKING_GUIDE.md](RIDE_BOOKING_GUIDE.md)** - Complete system documentation
- **[client-example.js](client-example.js)** - WebSocket client implementation
- **[postman-collection.json](postman-collection.json)** - API test collection

## 🏗️ Architecture

```
┌─────────────────┐
│  Client Apps    │ (React/React Native)
│  (Customer/     │
│   Driver)       │
└────────┬────────┘
         │
         ├─── REST API (Express)
         │
         └─── WebSocket (Socket.IO)
                │
         ┌──────┴──────┐
         │             │
    ┌────▼────┐   ┌────▼────┐
    │Services │   │ Models  │
    └────┬────┘   └────┬────┘
         │             │
         └──────┬──────┘
                │
         ┌──────▼───────┐
         │   MongoDB    │
         │ (Geospatial) │
         └──────────────┘
```

## 🔑 Key Features Explained

### 1. Location-Based Matching
- Uses MongoDB 2dsphere indexes for efficient geospatial queries
- Finds nearby drivers within configurable radius (default 10km)
- Returns drivers sorted by distance

### 2. Real-Time Communication
- WebSocket connections for instant updates
- Separate channels for customers and drivers
- Event-driven architecture for scalability

### 3. Automatic Timeouts
- Quick Rides: 3 minutes to find a driver
- Outstation: 5 minutes for driver acceptance
- Automatic cleanup and notifications

### 4. Request Workflow
1. Customer creates ride
2. Nearby drivers notified instantly
3. Drivers submit requests with vehicle details
4. Customer reviews and accepts one request
5. Other requests automatically declined
6. Ride progresses through states: PENDING → ACCEPTED → ONGOING → COMPLETED

## 🛠️ Troubleshooting

### MongoDB Connection Error
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Socket Connection Failed
Check CORS settings in `.env`:
```env
SOCKET_CORS_ORIGIN=http://localhost:3000
```

### Location Queries Not Working
Verify geospatial indexes are created:
```javascript
db.users.getIndexes()
// Should show 2dsphere index on location
```

## 🚀 Performance

- Handles 1000+ concurrent WebSocket connections
- Geospatial queries: O(log n) complexity
- Efficient connection pooling
- Automatic resource cleanup

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with express-validator
- CORS configuration
- Rate limiting (recommended for production)

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/bhyuserbackend |
| JWT_SECRET | JWT secret key | (required) |
| OUTSTATION_DISTANCE_KM | Distance threshold for outstation rides | 150 |
| QUICKRIDE_TIMEOUT_MS | Quick ride timeout in milliseconds | 180000 (3 min) |
| OUTSTATION_TIMEOUT_MS | Outstation timeout in milliseconds | 300000 (5 min) |
| QUICKRIDE_SEARCH_RADIUS_KM | Search radius for nearby drivers | 10 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

Proprietary - BHY Backend System

## 👥 Support

For issues and questions, contact the development team.

---

**Built with ❤️ using Node.js, Express, MongoDB, and Socket.IO**
- `DELETE /api/users/:id` - Delete user

### Other Routes

- `GET /health` - Health check
- `GET /` - Welcome message

## Authentication

Add the JWT token to your request headers:
```
Authorization: Bearer <your_token>
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - Token expiration time
- `CORS_ORIGIN` - Allowed CORS origin

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT (JSON Web Tokens)
- bcryptjs
- express-validator
- dotenv
- cors

## License

ISC
