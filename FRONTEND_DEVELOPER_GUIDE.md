# 🚀 Frontend Developer Guide - Ride Booking System

## 📋 Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication Flow](#authentication-flow)
4. [REST API Endpoints](#rest-api-endpoints)
5. [Socket.IO Events](#socketio-events)
6. [Complete Ride Booking Flow](#complete-ride-booking-flow)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)
9. [Postman Collection](#postman-collection)

---

## 🎯 Overview

This is a real-time ride booking system with two main user types:
- **Customers**: Book rides and accept/decline driver requests
- **Owners/Drivers**: Receive ride notifications and raise requests

### Key Features
- **Two Ride Types**:
  - `QUICKRIDE`: Local rides (<10km search radius, 3-minute timeout, auto-defaults on disconnect)
  - `OUTSTATION`: Long-distance rides (100km search radius, 1-hour timeout, advance booking)
- **Real-time Communication**: Socket.IO for live updates
- **Location-based Matching**: Geospatial queries for nearby drivers
- **Automatic Fare Calculation**: Distance-based pricing
- **Auto-Default System**: QUICKRIDE rides auto-default if customer disconnects

---

## 🚀 Getting Started

### Base URLs
```
REST API: http://localhost:5000/api
Socket.IO: http://localhost:5000
```

### Required Dependencies
```bash
npm install socket.io-client axios
```

---

## 🔐 Authentication Flow

### 1. Request OTP
**Endpoint**: `POST /api/customers/get-otp`

**Request Body**:
```json
{
  "phoneNumber": "9876543210"
}
```

**Response**:
```json
{
  "message": "OTP sent successfully.",
  "sessionId": "SESSION_ID_HERE",
  "success": true
}
```

### 2. Verify OTP
**Endpoint**: `POST /api/customers/verify-otp`

**Request Body**:
```json
{
  "phoneNumber": "9876543210",
  "OTP": "123456",
  "sessionId": "SESSION_ID_FROM_STEP_1",
  "fcmToken": "FIREBASE_TOKEN_OPTIONAL"
}
```

**Response**:
```json
{
  "message": "User login successfully",
  "token": "JWT_TOKEN_HERE",
  "customer": {
    "_id": "CUSTOMER_ID",
    "name": "John Doe",
    "phoneNumber": "9876543210",
    "email": "john@example.com"
  }
}
```

### 3. Create New User (If Not Exists)
**Endpoint**: `POST /api/customers/create-user`

**Request Body**:
```json
{
  "name": "John Doe",
  "phoneNumber": "9876543210",
  "email": "john@example.com"
}
```

**Response**:
```json
{
  "message": "User created successfully",
  "customer": {
    "_id": "CUSTOMER_ID",
    "name": "John Doe",
    "phoneNumber": "9876543210",
    "email": "john@example.com"
  }
}
```

---

## 📡 REST API Endpoints

### 🚗 Ride Management

#### 1. Create Ride (Alternative to Socket)
**Endpoint**: `POST /api/rides`

**Request Body**:
```json
{
  "to": "Airport",
  "from": "Downtown Hotel",
  "pickUpDateTime": "2026-01-28T10:00:00Z",
  "vehicleType": "SEDAN",
  "passangerCount": 2,
  "fare": 500,
  "rideType": "QUICKRIDE",
  "bookedBy": "CUSTOMER_ID",
  "estimatedDistance": 15
}
```

**Vehicle Types**: `HATCHBACK`, `SEDAN`, `ERTIGA`, `SUV`, `INNOVA`, `INNOVA CRYSTA`, `AUTO`, `BIKE`, `MUV`
**Ride Types**: `QUICKRIDE`, `OUTSTATION`
**Ride Status**: `PENDING`, `ACCEPTED`, `ONGOING`, `COMPLETED`, `CANCELLED`, `DEFAULTED`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "RIDE_ID",
    "to": "Airport",
    "from": "Downtown Hotel",
    "pickUpDateTime": "2026-01-28T10:00:00Z",
    "vehicleType": "SEDAN",
    "passangerCount": 2,
    "fare": 500,
    "rideType": "QUICKRIDE",
    "rideStatus": "PENDING",
    "bookedBy": "CUSTOMER_ID"
  }
}
```

#### 2. Get Ride by ID
**Endpoint**: `GET /api/rides/:rideId`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "RIDE_ID",
    "to": "Airport",
    "from": "Downtown Hotel",
    "rideStatus": "PENDING",
    "bookedBy": {
      "_id": "CUSTOMER_ID",
      "name": "John Doe",
      "phoneNumber": "9876543210"
    }
  }
}
```

#### 3. Get All Rides (With Filters)
**Endpoint**: `GET /api/rides?rideStatus=PENDING&rideType=QUICKRIDE`

**Query Parameters**:
- `rideStatus`: Filter by status (PENDING, ACCEPTED, ONGOING, COMPLETED, CANCELLED, DEFAULTED)
- `rideType`: Filter by type (QUICKRIDE, OUTSTATION)
- `vehicleType`: Filter by vehicle type
- `bookedBy`: Filter by customer ID
- `assingTo`: Filter by assigned user ID

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "RIDE_ID",
      "to": "Airport",
      "from": "Downtown",
      "rideStatus": "PENDING",
      "fare": 500
    }
  ]
}
```

#### 4. Get Rides by Customer
**Endpoint**: `GET /api/rides/customer/:customerId`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "RIDE_ID",
      "to": "Airport",
      "from": "Hotel",
      "rideStatus": "COMPLETED",
      "fare": 500
    }
  ]
}
```

#### 5. Get Pending Rides
**Endpoint**: `GET /api/rides/pending/all`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "RIDE_ID",
      "rideStatus": "PENDING"
    }
  ]
}
```

#### 6. Get Ride Statistics
**Endpoint**: `GET /api/rides/statistics/summary?userId=USER_ID`

**Response**:
```json
{
  "success": true,
  "statistics": {
    "totalRides": 150,
    "pendingRides": 5,
    "acceptedRides": 3,
    "ongoingRides": 2,
    "completedRides": 130,
    "cancelledRides": 8,
    "defaultedRides": 2
  }
}
```

#### 7. Update Ride Status
**Endpoint**: `PUT /api/rides/:rideId/status`

**Request Body**:
```json
{
  "rideStatus": "ACCEPTED"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "RIDE_ID",
    "rideStatus": "ACCEPTED"
  }
}
```

#### 8. Update Ride Fare
**Endpoint**: `PUT /api/rides/:rideId/fare`

**Request Body**:
```json
{
  "fare": 600
}
```

**Response**:
```json
{
  "success": true,
  "message": "Fare updated successfully",
  "data": {
    "_id": "RIDE_ID",
    "fare": 600
  }
}
```

#### 9. Assign Driver to Ride
**Endpoint**: `PUT /api/rides/:rideId/assign-driver`

**Request Body**:
```json
{
  "driverId": "DRIVER_ID",
  "userId": "USER_ID"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "RIDE_ID",
    "assingTo": "USER_ID"
  }
}
```

#### 10. Cancel Ride
**Endpoint**: `PUT /api/rides/:rideId/cancel`

**Request Body**:
```json
{
  "customerId": "CUSTOMER_ID"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ride cancelled successfully"
}
```

#### 11. Start Ride
**Endpoint**: `PUT /api/rides/:rideId/start`

**Request Body**:
```json
{
  "driverId": "DRIVER_ID"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ride started successfully"
}
```

#### 12. Complete Ride
**Endpoint**: `PUT /api/rides/:rideId/complete`

**Request Body**:
```json
{
  "driverId": "DRIVER_ID"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ride completed successfully"
}
```

---

### 📝 Request Management

#### 1. Create Request
**Endpoint**: `POST /api/requests`

**Request Body**:
```json
{
  "driver": "DRIVER_ID",
  "vehicle": "VEHICLE_ID",
  "requestRaisedBy": "USER_ID",
  "requestedFor": "RIDE_ID",
  "fare": 500,
  "requestStatus": "PENDING"
}
```

**Request Status**: `PENDING`, `APPROVED`, `DECLINED`, `COMPLETED`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "REQUEST_ID",
    "driver": "DRIVER_ID",
    "vehicle": "VEHICLE_ID",
    "requestStatus": "PENDING",
    "fare": 500
  }
}
```

#### 2. Get Request by ID
**Endpoint**: `GET /api/requests/:requestId`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "REQUEST_ID",
    "driver": {
      "_id": "DRIVER_ID",
      "name": "Driver Name",
      "phone": "9876543210"
    },
    "vehicle": {
      "_id": "VEHICLE_ID",
      "vehicleType": "SEDAN",
      "registrationNumber": "MH12AB1234"
    },
    "requestStatus": "PENDING",
    "fare": 500
  }
}
```

#### 3. Get All Requests (With Filters)
**Endpoint**: `GET /api/requests?requestStatus=PENDING`

**Query Parameters**:
- `requestStatus`: Filter by status (PENDING, APPROVED, DECLINED, COMPLETED)
- `driver`: Filter by driver ID
- `vehicle`: Filter by vehicle ID
- `requestRaisedBy`: Filter by user ID
- `requestedFor`: Filter by ride ID

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "REQUEST_ID",
      "requestStatus": "PENDING",
      "fare": 500
    }
  ]
}
```

#### 4. Get Requests by Driver
**Endpoint**: `GET /api/requests/driver/:driverId`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "REQUEST_ID",
      "driver": "DRIVER_ID",
      "requestStatus": "APPROVED"
    }
  ]
}
```

#### 5. Get Requests by User
**Endpoint**: `GET /api/requests/user/:userId`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "REQUEST_ID",
      "requestRaisedBy": "USER_ID",
      "requestStatus": "PENDING"
    }
  ]
}
```

#### 6. Get Requests by Ride
**Endpoint**: `GET /api/requests/ride/:rideId`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "REQUEST_ID",
      "requestedFor": "RIDE_ID",
      "requestStatus": "PENDING",
      "driver": {
        "name": "Driver Name"
      },
      "fare": 500
    }
  ]
}
```

#### 7. Get Pending Requests
**Endpoint**: `GET /api/requests/pending/all`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "REQUEST_ID",
      "requestStatus": "PENDING"
    }
  ]
}
```

#### 8. Check Driver Pending Request
**Endpoint**: `GET /api/requests/check/:driverId/:rideId`

**Response**:
```json
{
  "success": true,
  "hasPendingRequest": true,
  "request": {
    "_id": "REQUEST_ID",
    "requestStatus": "PENDING"
  }
}
```

#### 9. Get Request Statistics
**Endpoint**: `GET /api/requests/statistics/summary?userId=USER_ID`

**Response**:
```json
{
  "success": true,
  "statistics": {
    "totalRequests": 200,
    "pendingRequests": 10,
    "approvedRequests": 150,
    "declinedRequests": 30,
    "completedRequests": 140
  }
}
```

#### 10. Update Request Status
**Endpoint**: `PUT /api/requests/:requestId/status`

**Request Body**:
```json
{
  "requestStatus": "APPROVED"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "REQUEST_ID",
    "requestStatus": "APPROVED"
  }
}
```

#### 11. Approve Request
**Endpoint**: `PUT /api/requests/:requestId/approve`

**Response**:
```json
{
  "success": true,
  "message": "Request approved successfully",
  "data": {
    "_id": "REQUEST_ID",
    "requestStatus": "APPROVED"
  }
}
```

#### 12. Decline Request
**Endpoint**: `PUT /api/requests/:requestId/decline`

**Request Body**:
```json
{
  "reason": "Not available"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Request declined successfully"
}
```

#### 13. Bulk Approve Requests
**Endpoint**: `POST /api/requests/bulk/approve`

**Request Body**:
```json
{
  "requestIds": ["REQUEST_ID_1", "REQUEST_ID_2"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "2 requests approved successfully"
}
```

#### 14. Bulk Decline Requests
**Endpoint**: `POST /api/requests/bulk/decline`

**Request Body**:
```json
{
  "requestIds": ["REQUEST_ID_1", "REQUEST_ID_2"],
  "reason": "Not available"
}
```

**Response**:
```json
{
  "success": true,
  "message": "2 requests declined successfully"
}
```

---

### 👤 User & Location Management

#### 1. Update User Online Status
**Endpoint**: `PUT /api/users/:userId/status`

**Request Body**:
```json
{
  "isOnline": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Status updated successfully",
  "data": {
    "_id": "USER_ID",
    "isOnline": true
  }
}
```

#### 2. Update User Location
**Endpoint**: `PUT /api/users/:userId/location`

**Request Body**:
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

**Response**:
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "_id": "USER_ID",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    }
  }
}
```

#### 3. Find Nearby Online Users
**Endpoint**: `GET /api/users/nearby?latitude=12.9716&longitude=77.5946&radius=10&vehicleType=SEDAN`

**Query Parameters**:
- `latitude` (required): Customer latitude
- `longitude` (required): Customer longitude
- `radius` (optional): Search radius in kilometers (default: 10)
- `vehicleType` (optional): Filter by vehicle type

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "USER_ID",
      "name": "Driver Name",
      "phoneNumber": "9876543210",
      "distanceKm": 2.5,
      "availableDrivers": [
        {
          "_id": "DRIVER_ID",
          "name": "Driver Name"
        }
      ],
      "availableVehicles": [
        {
          "_id": "VEHICLE_ID",
          "vehicleType": "SEDAN"
        }
      ]
    }
  ]
}
```

#### 4. Get Customer Profile
**Endpoint**: `GET /api/customers/profile/:customerId`

**Headers**:
```
Authorization: Bearer JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "CUSTOMER_ID",
    "name": "John Doe",
    "phoneNumber": "9876543210",
    "email": "john@example.com",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    }
  }
}
```

---

## 🔌 Socket.IO Events

### Setup Socket.IO Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

socket.on('error', (error) => {
  console.error('Socket Error:', error.message);
});
```

---

### 👥 Customer Events

#### 1. Connect as Customer
**Emit**: `customer:connect`

```javascript
socket.emit('customer:connect', {
  customerId: 'CUSTOMER_ID'
});
```

**Listen**: `customer:connected`

```javascript
socket.on('customer:connected', (data) => {
  console.log('Connected as customer:', data);
  // {
  //   success: true,
  //   message: 'Customer connected successfully',
  //   customerId: 'CUSTOMER_ID',
  //   socketId: 'SOCKET_ID'
  // }
});
```

---

#### 2. Create Ride (Primary Method)
**Emit**: `ride:create`

```javascript
socket.emit('ride:create', {
  to: 'Airport',
  from: 'Downtown Hotel',
  pickUpDateTime: new Date().toISOString(),
  vehicleType: 'SEDAN',
  passangerCount: 2,
  fare: 500,
  rideType: 'QUICKRIDE',
  bookedBy: 'CUSTOMER_ID',
  estimatedDistance: 15,
  customerLocation: {
    latitude: 12.9716,
    longitude: 77.5946
  }
});
```

**Listen**: `ride:created`

```javascript
socket.on('ride:created', (data) => {
  console.log('Ride created:', data);
  // {
  //   success: true,
  //   ride: { _id: 'RIDE_ID', ... },
  //   nearbyDrivers: [
  //     { userId: 'USER_ID', name: 'Driver Name', distance: 2.5 }
  //   ],
  //   timeout: 180000,  // 3 minutes for QUICKRIDE, 1 hour for OUTSTATION
  //   searchRadius: 10   // 10km for QUICKRIDE, 100km for OUTSTATION
  // }
});
```

---

#### 3. Listen for New Requests
**Listen**: `request:new`

```javascript
socket.on('request:new', (data) => {
  console.log('New request received:', data);
  // {
  //   request: {
  //     _id: 'REQUEST_ID',
  //     driver: { _id: 'DRIVER_ID', name: 'Driver Name' },
  //     vehicle: { _id: 'VEHICLE_ID', vehicleType: 'SEDAN' },
  //     fare: 500,
  //     requestStatus: 'PENDING'
  //   },
  //   message: 'New request received for your ride'
  // }
});
```

---

#### 4. Accept Request
**Emit**: `request:accept`

```javascript
socket.emit('request:accept', {
  requestId: 'REQUEST_ID',
  rideId: 'RIDE_ID'
});
```

**Listen**: `request:accept-success`

```javascript
socket.on('request:accept-success', (data) => {
  console.log('Request accepted:', data);
  // {
  //   success: true,
  //   request: { _id: 'REQUEST_ID', requestStatus: 'APPROVED' },
  //   message: 'Request accepted successfully'
  // }
});
```

**Also Listen**: `ride:request-accepted`

```javascript
socket.on('ride:request-accepted', (data) => {
  console.log('Ride request accepted:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   requestId: 'REQUEST_ID',
  //   driver: { _id: 'DRIVER_ID', name: 'Driver Name' },
  //   vehicle: { _id: 'VEHICLE_ID', vehicleType: 'SEDAN' }
  // }
});
```

---

#### 5. Decline Request
**Emit**: `request:decline`

```javascript
socket.emit('request:decline', {
  requestId: 'REQUEST_ID',
  rideId: 'RIDE_ID',
  reason: 'Not suitable'
});
```

**Listen**: `request:decline-success`

```javascript
socket.on('request:decline-success', (data) => {
  console.log('Request declined:', data);
  // {
  //   success: true,
  //   requestId: 'REQUEST_ID',
  //   message: 'Request declined'
  // }
});
```

---

#### 6. Update Ride Fare
**Emit**: `ride:update-fare`

```javascript
socket.emit('ride:update-fare', {
  rideId: 'RIDE_ID',
  newFare: 600
});
```

**Listen**: `ride:update-fare-success`

```javascript
socket.on('ride:update-fare-success', (data) => {
  console.log('Fare updated:', data);
  // {
  //   success: true,
  //   ride: { _id: 'RIDE_ID', fare: 600 }
  // }
});
```

**Listen**: `ride:fare-updated` (Broadcasted to all)

```javascript
socket.on('ride:fare-updated', (data) => {
  console.log('Fare updated notification:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   newFare: 600,
  //   message: 'Ride fare has been updated'
  // }
});
```

---

#### 7. Cancel Ride
**Emit**: `ride:cancel`

```javascript
socket.emit('ride:cancel', {
  rideId: 'RIDE_ID',
  customerId: 'CUSTOMER_ID'
});
```

**Listen**: `ride:cancel-success`

```javascript
socket.on('ride:cancel-success', (data) => {
  console.log('Ride cancelled:', data);
  // {
  //   success: true,
  //   ride: { _id: 'RIDE_ID', rideStatus: 'CANCELLED' }
  // }
});
```

**Listen**: `ride:cancelled`

```javascript
socket.on('ride:cancelled', (data) => {
  console.log('Ride cancelled notification:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   message: 'Ride has been cancelled'
  // }
});
```

---

#### 8. Listen for Ride Started
**Listen**: `ride:started`

```javascript
socket.on('ride:started', (data) => {
  console.log('Ride started:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   status: 'ONGOING',
  //   message: 'Driver has started the ride'
  // }
});
```

---

#### 9. Listen for Ride Completed
**Listen**: `ride:completed`

```javascript
socket.on('ride:completed', (data) => {
  console.log('Ride completed:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   status: 'COMPLETED',
  //   message: 'Ride has been completed'
  // }
});
```

---

#### 10. Listen for Ride Timeout
**Listen**: `ride:timeout`

```javascript
socket.on('ride:timeout', (data) => {
  console.log('Ride timeout:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   message: 'Ride defaulted - No driver found within 3 minutes',
  //   status: 'DEFAULTED',  // DEFAULTED for QUICKRIDE, CANCELLED for OUTSTATION
  //   rideType: 'QUICKRIDE'
  // }
});
```

---

#### 11. Listen for Ride Defaulted (Auto-cancelled on disconnect)
**Listen**: `ride:defaulted`

```javascript
socket.on('ride:defaulted', (data) => {
  console.log('Ride defaulted:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   status: 'DEFAULTED',
  //   reason: 'Customer disconnected',
  //   message: 'Ride has been automatically defaulted'
  // }
});
```

---

#### 12. Subscribe to Specific Ride Updates
**Emit**: `ride:subscribe`

```javascript
socket.emit('ride:subscribe', {
  rideId: 'RIDE_ID'
});
```

**Listen**: `ride:subscribed`

```javascript
socket.on('ride:subscribed', (data) => {
  console.log('Subscribed to ride:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   message: 'Subscribed to ride updates'
  // }
});
```

---

### 🚗 Owner/Driver Events

#### 1. Connect as Owner
**Emit**: `user:connect`

```javascript
socket.emit('user:connect', {
  userId: 'USER_ID',
  userType: 'OWNER'  // or 'DRIVER'
});
```

**Listen**: `user:connected`

```javascript
socket.on('user:connected', (data) => {
  console.log('Connected as owner:', data);
  // {
  //   success: true,
  //   message: 'Connected successfully as owner',
  //   userId: 'USER_ID',
  //   socketId: 'SOCKET_ID',
  //   userType: 'OWNER'
  // }
});
```

---

#### 2. Subscribe to Rides
**Emit**: `rides:subscribe`

```javascript
socket.emit('rides:subscribe', {
  city: 'Bangalore'  // Optional: filter by city
});
```

**Listen**: `rides:subscribed`

```javascript
socket.on('rides:subscribed', (data) => {
  console.log('Subscribed to rides:', data);
  // {
  //   success: true,
  //   message: 'Subscribed to ride updates',
  //   city: 'Bangalore'
  // }
});
```

---

#### 3. Get Available Rides
**Emit**: `rides:get-available`

```javascript
socket.emit('rides:get-available', {
  filters: {
    rideStatus: 'PENDING',
    rideType: 'QUICKRIDE',
    vehicleType: 'SEDAN'
  }
});
```

**Listen**: `rides:list`

```javascript
socket.on('rides:list', (data) => {
  console.log('Available rides:', data);
  // {
  //   success: true,
  //   rides: [
  //     {
  //       _id: 'RIDE_ID',
  //       from: 'Downtown',
  //       to: 'Airport',
  //       vehicleType: 'SEDAN',
  //       fare: 500,
  //       rideStatus: 'PENDING'
  //     }
  //   ],
  //   count: 10
  // }
});
```

---

#### 4. Listen for New Rides
**Listen**: `ride:new`

```javascript
socket.on('ride:new', (data) => {
  console.log('New ride available:', data);
  // {
  //   ride: {
  //     _id: 'RIDE_ID',
  //     from: 'Downtown',
  //     to: 'Airport',
  //     vehicleType: 'SEDAN',
  //     fare: 500,
  //     rideType: 'QUICKRIDE'
  //   },
  //   distance: 2.5,
  //   message: 'New ride 2.5 km away from you'
  // }
});
```

**Also Listen**: `ride:new-request`

```javascript
socket.on('ride:new-request', (data) => {
  console.log('New ride request:', data);
  // {
  //   ride: {
  //     _id: 'RIDE_ID',
  //     to: 'Airport',
  //     from: 'Downtown',
  //     vehicleType: 'SEDAN',
  //     fare: 500,
  //     distanceKm: 2.5
  //   },
  //   timeout: 180000
  // }
});
```

---

#### 5. Create Request for Ride
**Emit**: `request:create`

```javascript
socket.emit('request:create', {
  driver: 'DRIVER_ID',
  vehicle: 'VEHICLE_ID',
  requestRaisedBy: 'USER_ID',
  requestedFor: 'RIDE_ID',
  fare: 500,
  requestStatus: 'PENDING'
});
```

**Listen**: `request:created`

```javascript
socket.on('request:created', (data) => {
  console.log('Request created:', data);
  // {
  //   success: true,
  //   request: { _id: 'REQUEST_ID', requestStatus: 'PENDING' },
  //   message: 'Request submitted successfully'
  // }
});
```

---

#### 6. Listen for Request Accepted
**Listen**: `request:accepted`

```javascript
socket.on('request:accepted', (data) => {
  console.log('Request accepted by customer:', data);
  // {
  //   request: { _id: 'REQUEST_ID', requestStatus: 'APPROVED' },
  //   message: 'Your request has been accepted!',
  //   rideId: 'RIDE_ID'
  // }
});
```

---

#### 7. Listen for Request Declined
**Listen**: `request:declined`

```javascript
socket.on('request:declined', (data) => {
  console.log('Request declined:', data);
  // {
  //   requestId: 'REQUEST_ID',
  //   rideId: 'RIDE_ID',
  //   reason: 'Customer accepted another request'
  // }
});
```

---

#### 8. Toggle Online Status
**Emit**: `user:toggle-status`

```javascript
socket.emit('user:toggle-status', {
  userId: 'USER_ID',
  isOnline: true
});
```

**Listen**: `user:status-updated`

```javascript
socket.on('user:status-updated', (data) => {
  console.log('Status updated:', data);
  // {
  //   success: true,
  //   isOnline: true,
  //   message: 'Status updated to online'
  // }
});
```

---

#### 9. Update Location
**Emit**: `user:update-location`

```javascript
socket.emit('user:update-location', {
  userId: 'USER_ID',
  latitude: 12.9716,
  longitude: 77.5946
});
```

**Listen**: `user:location-updated`

```javascript
socket.on('user:location-updated', (data) => {
  console.log('Location updated:', data);
  // {
  //   success: true,
  //   latitude: 12.9716,
  //   longitude: 77.5946
  // }
});
```

---

#### 10. Start Ride
**Emit**: `ride:start`

```javascript
socket.emit('ride:start', {
  rideId: 'RIDE_ID',
  driverId: 'DRIVER_ID'
});
```

**Listen**: `ride:start-success`

```javascript
socket.on('ride:start-success', (data) => {
  console.log('Ride started:', data);
  // {
  //   success: true,
  //   ride: { _id: 'RIDE_ID', rideStatus: 'ONGOING' }
  // }
});
```

---

#### 11. Complete Ride
**Emit**: `ride:complete`

```javascript
socket.emit('ride:complete', {
  rideId: 'RIDE_ID',
  driverId: 'DRIVER_ID'
});
```

**Listen**: `ride:complete-success`

```javascript
socket.on('ride:complete-success', (data) => {
  console.log('Ride completed:', data);
  // {
  //   success: true,
  //   ride: { _id: 'RIDE_ID', rideStatus: 'COMPLETED' }
  // }
});
```

---

#### 12. Listen for Ride Cancelled by Customer
**Listen**: `ride:cancelled-by-customer`

```javascript
socket.on('ride:cancelled-by-customer', (data) => {
  console.log('Customer cancelled ride:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   requestId: 'REQUEST_ID',
  //   message: 'Customer has cancelled the ride'
  // }
});
```

---

#### 13. Listen for Ride Updates (Status Changes)
**Listen**: `ride:updated`

```javascript
socket.on('ride:updated', (data) => {
  console.log('Ride updated:', data);
  // {
  //   rideId: 'RIDE_ID',
  //   rideStatus: 'ACCEPTED',
  //   message: 'Ride accepted by customer'
  // }
});
```

---

## 🔄 Complete Ride Booking Flow

### Customer Flow

```javascript
// 1. Initialize Socket
const socket = io('http://localhost:5000');

// 2. Connect as Customer
socket.emit('customer:connect', { customerId: 'CUSTOMER_ID' });

socket.on('customer:connected', (data) => {
  console.log('Connected:', data.customerId);
  
  // 3. Create Ride
  socket.emit('ride:create', {
    to: 'Airport',
    from: 'Hotel',
    pickUpDateTime: new Date().toISOString(),
    vehicleType: 'SEDAN',
    passangerCount: 2,
    fare: 500,
    rideType: 'QUICKRIDE',
    bookedBy: 'CUSTOMER_ID',
    estimatedDistance: 10,
    customerLocation: {
      latitude: 12.9716,
      longitude: 77.5946
    }
  });
});

// 4. Ride Created - Wait for Requests
socket.on('ride:created', (data) => {
  console.log('Ride created:', data.ride._id);
  console.log('Nearby drivers:', data.nearbyDrivers.length);
  console.log('Timeout:', data.timeout / 1000, 'seconds');
  
  // Subscribe to ride updates
  socket.emit('ride:subscribe', { rideId: data.ride._id });
});

// 5. Receive New Requests
socket.on('request:new', (data) => {
  console.log('New request from:', data.request.driver.name);
  console.log('Fare offered:', data.request.fare);
  
  // Display request to customer
  displayRequest(data.request);
});

// 6. Accept a Request
function acceptRequest(requestId, rideId) {
  socket.emit('request:accept', { requestId, rideId });
}

socket.on('request:accept-success', (data) => {
  console.log('Request accepted successfully');
  // Other pending requests are auto-declined
});

// 7. Or Decline a Request
function declineRequest(requestId, rideId) {
  socket.emit('request:decline', {
    requestId,
    rideId,
    reason: 'Looking for better option'
  });
}

// 8. Optional: Update Fare
function updateFare(rideId, newFare) {
  socket.emit('ride:update-fare', { rideId, newFare });
}

socket.on('ride:fare-updated', (data) => {
  console.log('Fare updated to:', data.newFare);
  // Update UI with new fare
});

// 9. Listen for Ride Status Changes
socket.on('ride:started', (data) => {
  console.log('Driver started the ride');
  // Show "Ride in Progress" UI
});

socket.on('ride:completed', (data) => {
  console.log('Ride completed');
  // Show payment/rating screen
});

// 10. Optional: Cancel Ride
function cancelRide(rideId, customerId) {
  socket.emit('ride:cancel', { rideId, customerId });
}

// 11. Handle Timeout
socket.on('ride:timeout', (data) => {
  console.log('Ride timeout:', data.message);
  console.log('Status:', data.status);  // DEFAULTED for QUICKRIDE
  // Show "No drivers available" message
});

// 12. Handle Auto-Default (if disconnected)
socket.on('ride:defaulted', (data) => {
  console.log('Ride auto-defaulted:', data.reason);
  // Show notification about defaulted ride
});
```

### Owner/Driver Flow

```javascript
// 1. Initialize Socket
const socket = io('http://localhost:5000');

// 2. Connect as Owner
socket.emit('user:connect', {
  userId: 'USER_ID',
  userType: 'OWNER'
});

socket.on('user:connected', (data) => {
  console.log('Connected as owner:', data.userId);
  
  // 3. Toggle Online Status
  socket.emit('user:toggle-status', {
    userId: 'USER_ID',
    isOnline: true
  });
  
  // 4. Subscribe to Rides
  socket.emit('rides:subscribe', { city: 'Bangalore' });
});

// 5. Update Location Periodically
setInterval(() => {
  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit('user:update-location', {
      userId: 'USER_ID',
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    });
  });
}, 30000); // Every 30 seconds

// 6. Listen for New Rides
socket.on('ride:new', (data) => {
  console.log('New ride:', data.ride);
  console.log('Distance:', data.distance, 'km');
  
  // Display ride notification
  displayRideNotification(data.ride);
});

// 7. Get Available Rides
function getAvailableRides() {
  socket.emit('rides:get-available', {
    filters: {
      rideStatus: 'PENDING',
      vehicleType: 'SEDAN'
    }
  });
}

socket.on('rides:list', (data) => {
  console.log('Available rides:', data.rides);
  // Display rides list
});

// 8. Create Request for Ride
function createRequest(rideId) {
  socket.emit('request:create', {
    driver: 'DRIVER_ID',
    vehicle: 'VEHICLE_ID',
    requestRaisedBy: 'USER_ID',
    requestedFor: rideId,
    fare: 550,  // Can offer different fare
    requestStatus: 'PENDING'
  });
}

socket.on('request:created', (data) => {
  console.log('Request submitted:', data.request._id);
  // Show "Request sent" message
});

// 9. Listen for Request Response
socket.on('request:accepted', (data) => {
  console.log('Customer accepted your request!');
  console.log('Ride ID:', data.rideId);
  // Navigate to ride details screen
});

socket.on('request:declined', (data) => {
  console.log('Request declined:', data.reason);
  // Show notification
});

// 10. Start Ride (After Acceptance)
function startRide(rideId, driverId) {
  socket.emit('ride:start', { rideId, driverId });
}

socket.on('ride:start-success', (data) => {
  console.log('Ride started successfully');
  // Show "Ride in Progress" UI
});

// 11. Complete Ride
function completeRide(rideId, driverId) {
  socket.emit('ride:complete', { rideId, driverId });
}

socket.on('ride:complete-success', (data) => {
  console.log('Ride completed');
  // Show completion screen
});

// 12. Listen for Customer Cancellation
socket.on('ride:cancelled-by-customer', (data) => {
  console.log('Customer cancelled ride:', data.rideId);
  // Show cancellation notification
});

// 13. Listen for Fare Updates
socket.on('ride:fare-updated', (data) => {
  console.log('Customer updated fare:', data.newFare);
  // Update fare in UI
});

// 14. Listen for Ride Status Updates
socket.on('ride:updated', (data) => {
  console.log('Ride status changed:', data.rideStatus);
  // Update ride card status
});
```

---

## 📊 Data Models

### Customer Model
```javascript
{
  _id: ObjectId,
  name: String,           // Required, 2-100 characters
  phoneNumber: String,    // Required, unique, 10 digits starting with 6-9
  email: String,          // Optional, valid email format
  fcmToken: String,       // Optional, for push notifications
  location: {
    type: 'Point',
    coordinates: [Number, Number]  // [longitude, latitude]
  },
  lastLocation: {
    latitude: Number,
    longitude: Number,
    updatedAt: Date
  },
  socketId: String,       // Current socket connection ID
  createdAt: Date,
  updatedAt: Date
}
```

### User Model (Owner)
```javascript
{
  _id: ObjectId,
  name: String,           // Required
  phoneNumber: String,    // Required, unique
  email: String,          // Optional
  isOnline: Boolean,      // Online/Offline status
  location: {
    type: 'Point',
    coordinates: [Number, Number]  // [longitude, latitude]
  },
  socketId: String,       // Current socket connection ID
  availableDrivers: [ObjectId],  // References to Driver documents
  availableVehicles: [ObjectId], // References to Vehicle documents
  createdAt: Date,
  updatedAt: Date
}
```

### Ride Model
```javascript
{
  _id: ObjectId,
  to: String,             // Required, destination
  from: String,           // Required, pickup location
  pickUpDateTime: Date,   // Required, pickup time
  vehicleType: String,    // Required, enum: [HATCHBACK, SEDAN, ERTIGA, SUV, INNOVA, INNOVA CRYSTA, AUTO, BIKE, MUV]
  passangerCount: Number, // Required, 1-10
  fare: Number,           // Required, minimum 0
  rideType: String,       // Required, enum: [QUICKRIDE, OUTSTATION]
  bookedBy: ObjectId,     // Required, reference to Customer
  assingTo: ObjectId,     // Optional, reference to User (assigned driver/owner)
  rideStatus: String,     // Required, enum: [PENDING, ACCEPTED, ONGOING, COMPLETED, CANCELLED, DEFAULTED]
  defaultReason: String,  // Optional, reason for defaulting (auto-cancellation)
  estimatedDistance: Number, // Optional, estimated distance in km
  createdAt: Date,
  updatedAt: Date
}
```

### Request Model
```javascript
{
  _id: ObjectId,
  driver: ObjectId,       // Required, reference to Driver
  vehicle: ObjectId,      // Required, reference to Vehicle
  requestRaisedBy: ObjectId,  // Required, reference to User (owner)
  requestStatus: String,  // Required, enum: [PENDING, APPROVED, DECLINED, COMPLETED]
  fare: Number,           // Required, minimum 0
  requestedFor: ObjectId, // Required, reference to Ride
  createdAt: Date,
  updatedAt: Date
}
```

### Driver Model
```javascript
{
  _id: ObjectId,
  name: String,           // Required, 2-100 characters
  phone: String,          // Required, 10 digits
  address: String,        // Required, minimum 5 characters
  city: String,           // Required
  driverImage: String,    // Required, image URL
  dlNumber: String,       // Required, driving license number
  dlFront: String,        // Required, DL front image URL
  dlBack: String,         // Required, DL back image URL
  userId: ObjectId,       // Required, reference to User
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle Model
```javascript
{
  _id: ObjectId,
  vehicleType: String,    // Required, enum: [HATCHBACK, SEDAN, ERTIGA, SUV, INNOVA, INNOVA CRYSTA]
  registrationNumber: String, // Required, unique
  yearOfManufacture: String,  // Required, 4-digit year
  insuranceImage: String,     // Optional, insurance document URL
  insuranceExpDate: Date,     // Optional, insurance expiry date
  vehicleImages: [String],    // Required, array of image URLs
  rcImage: String,            // Optional, RC document URL
  userId: ObjectId,           // Required, reference to User
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 Error Handling

### Socket.IO Errors
```javascript
socket.on('error', (error) => {
  console.error('Socket Error:', error.message);
  
  // Display error to user
  showErrorNotification(error.message);
  
  // Common errors:
  // - "Invalid customer ID"
  // - "Ride not found"
  // - "Request already exists"
  // - "Driver not online"
});
```

### REST API Errors
```javascript
// Success Response
{
  success: true,
  message: "Operation successful",
  data: { /* result */ }
}

// Error Response
{
  success: false,
  message: "Error description",
  errors: { /* error details */ }
}

// Common HTTP Status Codes:
// 200 - Success
// 201 - Created
// 400 - Bad Request (validation error)
// 401 - Unauthorized (missing/invalid token)
// 403 - Forbidden (insufficient permissions)
// 404 - Not Found
// 500 - Internal Server Error
```

### Handling Network Errors
```javascript
// Axios Error Handling
try {
  const response = await axios.post('/api/rides', rideData);
  console.log('Success:', response.data);
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('Error:', error.response.data.message);
  } else if (error.request) {
    // Request made but no response
    console.error('Network error - No response from server');
  } else {
    // Something else happened
    console.error('Error:', error.message);
  }
}
```

---

## 📮 Postman Collection

### Import Collection
1. Open Postman
2. Click "Import"
3. Select `postman-collection.json` from project root
4. Collection is ready to use!

### Environment Variables
Create a new environment in Postman with these variables:

```json
{
  "base_url": "http://localhost:5000",
  "customer_id": "YOUR_CUSTOMER_ID",
  "user_id": "YOUR_USER_ID",
  "driver_id": "YOUR_DRIVER_ID",
  "vehicle_id": "YOUR_VEHICLE_ID",
  "ride_id": "YOUR_RIDE_ID",
  "request_id": "YOUR_REQUEST_ID",
  "jwt_token": "YOUR_JWT_TOKEN"
}
```

### Quick Test Flow

#### 1. Health Check
```
GET {{base_url}}/health
```

#### 2. Get OTP
```
POST {{base_url}}/api/customers/get-otp
Body:
{
  "phoneNumber": "9876543210"
}
```

#### 3. Verify OTP
```
POST {{base_url}}/api/customers/verify-otp
Body:
{
  "phoneNumber": "9876543210",
  "OTP": "123456",
  "sessionId": "{{session_id}}"
}
```

#### 4. Create Ride
```
POST {{base_url}}/api/rides
Body:
{
  "to": "Airport",
  "from": "Hotel",
  "pickUpDateTime": "2026-01-28T10:00:00Z",
  "vehicleType": "SEDAN",
  "passangerCount": 2,
  "fare": 500,
  "rideType": "QUICKRIDE",
  "bookedBy": "{{customer_id}}",
  "estimatedDistance": 10
}
```

#### 5. Get Available Rides
```
GET {{base_url}}/api/rides?rideStatus=PENDING
```

#### 6. Create Request
```
POST {{base_url}}/api/requests
Body:
{
  "driver": "{{driver_id}}",
  "vehicle": "{{vehicle_id}}",
  "requestRaisedBy": "{{user_id}}",
  "requestedFor": "{{ride_id}}",
  "fare": 500,
  "requestStatus": "PENDING"
}
```

#### 7. Approve Request
```
PUT {{base_url}}/api/requests/{{request_id}}/approve
```

#### 8. Start Ride
```
PUT {{base_url}}/api/rides/{{ride_id}}/start
Body:
{
  "driverId": "{{driver_id}}"
}
```

#### 9. Complete Ride
```
PUT {{base_url}}/api/rides/{{ride_id}}/complete
Body:
{
  "driverId": "{{driver_id}}"
}
```

---

## 🎯 Key Implementation Tips

### 1. Distance-Based Fare Calculation

```javascript
function calculateFare(distance, vehicleType, rideType) {
  const baseRates = {
    QUICKRIDE: {
      HATCHBACK: 12,
      SEDAN: 14,
      SUV: 18,
      ERTIGA: 16,
      INNOVA: 20,
      'INNOVA CRYSTA': 28
    },
    OUTSTATION: {
      HATCHBACK: 12,
      SEDAN: 13,
      SUV: 15,
      ERTIGA: 14,
      INNOVA: 16,
      'INNOVA CRYSTA': 18
    }
  };
  
  const baseFare = 50;
  const perKmRate = baseRates[rideType][vehicleType] || 12;
  
  return baseFare + (distance * perKmRate);
}
```

### 2. Location Updates
Send location updates every 30 seconds when driver is online:

```javascript
setInterval(() => {
  if (isOnline && socket.connected) {
    getCurrentLocation().then(coords => {
      socket.emit('user:update-location', {
        userId: currentUserId,
        latitude: coords.latitude,
        longitude: coords.longitude
      });
    });
  }
}, 30000);
```

### 3. Socket Reconnection Handling

```javascript
socket.on('disconnect', () => {
  console.log('Disconnected from server');
  // Show offline indicator
  showOfflineIndicator();
});

socket.on('connect', () => {
  console.log('Reconnected to server');
  // Hide offline indicator
  hideOfflineIndicator();
  
  // Re-authenticate
  if (userType === 'customer') {
    socket.emit('customer:connect', { customerId });
  } else {
    socket.emit('user:connect', { userId, userType: 'OWNER' });
    socket.emit('rides:subscribe', { city });
  }
});
```

### 4. QUICKRIDE vs OUTSTATION Logic

```javascript
function getRideConfig(rideType) {
  return {
    QUICKRIDE: {
      searchRadius: 10,        // km
      timeout: 180000,         // 3 minutes
      advanceBooking: false,
      autoDefault: true,       // Auto-default on disconnect
      allowedVehicles: ['HATCHBACK', 'SEDAN', 'ERTIGA', 'SUV', 'INNOVA', 'INNOVA CRYSTA', 'AUTO', 'BIKE', 'MUV']
    },
    OUTSTATION: {
      searchRadius: 100,       // km
      timeout: 3600000,        // 1 hour
      advanceBooking: true,    // Minimum 2 hours in advance
      autoDefault: false,      // CANCELLED on timeout instead
      allowedVehicles: ['HATCHBACK', 'SEDAN', 'ERTIGA', 'SUV', 'INNOVA', 'INNOVA CRYSTA', 'MUV']  // No AUTO/BIKE
    }
  }[rideType];
}
```

### 5. Request Timeout Visualization

```javascript
function startTimeoutCountdown(timeout) {
  const endTime = Date.now() + timeout;
  
  const interval = setInterval(() => {
    const remaining = endTime - Date.now();
    
    if (remaining <= 0) {
      clearInterval(interval);
      showTimeoutMessage();
      return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    updateCountdownDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }, 1000);
}
```

---

## 📞 Support & Resources

### Testing Files
- **WebSocket Testing Interface**: Open `WEBSOCKET_TESTING.html` in browser for live testing
- **Postman Collection**: `postman-collection.json` for API testing
- **Client Examples**: `client-example.js` for code samples

### Documentation Files
- `WEBSOCKET_COMPLETE_GUIDE.md` - Complete WebSocket documentation
- `WEBSOCKET_FRONTEND_GUIDE.md` - Frontend integration guide
- `WEBSOCKET_POSTMAN_GUIDE.md` - Postman testing guide
- `OUTSTATION_IMPLEMENTATION.md` - OUTSTATION feature details
- `AUTO_DEFAULT_FEATURE.md` - Auto-default functionality

### Environment Variables
Create `.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/bhyuserbackend
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
QUICKRIDE_TIMEOUT_MS=180000
OUTSTATION_TIMEOUT_MS=3600000
QUICKRIDE_SEARCH_RADIUS_KM=10
OUTSTATION_SEARCH_RADIUS_KM=100
MAX_DRIVERS_TO_NOTIFY=20
SOCKET_CORS_ORIGIN=http://localhost:3000
```

---

## 🎉 Quick Start Checklist

- [ ] Install dependencies: `npm install socket.io-client axios`
- [ ] Set up Socket.IO connection
- [ ] Implement customer connect flow
- [ ] Implement ride creation with location
- [ ] Handle ride:created event and display nearby drivers
- [ ] Listen for request:new events
- [ ] Implement request accept/decline
- [ ] Handle ride status changes (started, completed)
- [ ] Implement timeout handling
- [ ] Implement auto-default handling
- [ ] Add location updates for drivers
- [ ] Implement owner/driver ride subscription
- [ ] Handle ride:new notifications
- [ ] Implement request creation
- [ ] Handle request acceptance/decline notifications
- [ ] Test complete flow end-to-end

---

**Happy Coding! 🚀**

For any questions or issues, refer to the documentation files or open an issue in the repository.
