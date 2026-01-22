# BHY User Backend

A Node.js/Express backend API with MongoDB for user management.

## Features

- User registration and authentication
- JWT token-based authorization
- Role-based access control (User/Admin)
- Password hashing with bcrypt
- Input validation
- Error handling middleware
- MongoDB integration with Mongoose

## Project Structure

```
bhyuserbackend/
├── config/
│   └── dbConnection.js     # MongoDB connection configuration
├── controllers/
│   └── userController.js   # User business logic
├── middleware/
│   ├── auth.js            # Authentication & authorization
│   ├── errorHandler.js    # Global error handler
│   └── logger.js          # Request logger
├── models/
│   └── User.js            # User schema and model
├── routers/
│   └── userRoutes.js      # User API routes
├── utils/
│   ├── responseHelper.js  # Response formatting utilities
│   └── validation.js      # Validation utilities
├── .env                   # Environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project dependencies
├── server.js             # Application entry point
└── README.md             # Project documentation
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your configuration

3. Make sure MongoDB is running on your system or update `MONGODB_URI` in `.env`

## Running the Application

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Public Routes

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user

### Protected Routes (Requires Authentication)

- `GET /api/users/profile` - Get current user profile
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user

### Admin Only Routes

- `GET /api/users` - Get all users
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
