# Customer Ride History APIs Documentation

## Overview
APIs for customers to retrieve their ride history with status filtering and get their currently active rides.

---

## 1. Get Customer Ride History

**Route:** `GET /api/rides/customer/:customerId/history`

**Description:** Get customer ride history with optional status filter

**Path Parameters:**
- `customerId` (required): Customer's MongoDB ObjectId

**Query Parameters:**
- `status` (optional): Filter by ride status
  - Valid values: `PENDING`, `ACCEPTED`, `ONGOING`, `COMPLETED`, `CANCELLED`, `DEFAULTED`
  - If not provided, returns all rides

**Examples:**
- Get all rides: `/api/rides/customer/507f1f77bcf86cd799439011/history`
- Get completed rides: `/api/rides/customer/507f1f77bcf86cd799439011/history?status=COMPLETED`
- Get cancelled rides: `/api/rides/customer/507f1f77bcf86cd799439011/history?status=CANCELLED`

**Response:**
```json
{
  "status": 200,
  "message": "Ride history fetched successfully",
  "data": {
    "count": 25,
    "rides": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "to": "Airport, Terminal 2",
        "from": "Home, 123 Main Street",
        "pickUpDateTime": "2026-02-01T10:30:00.000Z",
        "vehicleType": "SEDAN",
        "passangerCount": 2,
        "fare": 450,
        "rideType": "QUICKRIDE",
        "bookedBy": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "9876543210"
        },
        "assingTo": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Driver Name",
          "phoneNumber": "9876543211"
        },
        "rideStatus": "COMPLETED",
        "createdAt": "2026-02-01T09:45:00.000Z",
        "updatedAt": "2026-02-01T11:15:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439014",
        "to": "Mall, Downtown",
        "from": "Home, 123 Main Street",
        "pickUpDateTime": "2026-01-28T15:00:00.000Z",
        "vehicleType": "AUTO",
        "passangerCount": 1,
        "fare": 120,
        "rideType": "QUICKRIDE",
        "bookedBy": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "9876543210"
        },
        "assingTo": null,
        "rideStatus": "CANCELLED",
        "createdAt": "2026-01-28T14:30:00.000Z",
        "updatedAt": "2026-01-28T14:50:00.000Z"
      }
    ]
  }
}
```

---

## 2. Get Customer Active Rides

**Route:** `GET /api/rides/customer/:customerId/active`

**Description:** Get customer's currently active rides (PENDING, ACCEPTED, or ONGOING status)

**Path Parameters:**
- `customerId` (required): Customer's MongoDB ObjectId

**Response:**
```json
{
  "status": 200,
  "message": "Active rides fetched successfully",
  "data": {
    "count": 2,
    "rides": [
      {
        "_id": "507f1f77bcf86cd799439015",
        "to": "Office, Tech Park",
        "from": "Home, 123 Main Street",
        "pickUpDateTime": "2026-02-05T09:00:00.000Z",
        "vehicleType": "SEDAN",
        "passangerCount": 1,
        "fare": 250,
        "rideType": "QUICKRIDE",
        "bookedBy": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "9876543210"
        },
        "assingTo": {
          "_id": "507f1f77bcf86cd799439016",
          "name": "Driver John",
          "phoneNumber": "9876543212"
        },
        "rideStatus": "ONGOING",
        "createdAt": "2026-02-05T08:30:00.000Z",
        "updatedAt": "2026-02-05T09:05:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439017",
        "to": "Restaurant, City Center",
        "from": "Office, Tech Park",
        "pickUpDateTime": "2026-02-05T13:00:00.000Z",
        "vehicleType": "AUTO",
        "passangerCount": 2,
        "fare": 150,
        "rideType": "QUICKRIDE",
        "bookedBy": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "9876543210"
        },
        "assingTo": null,
        "rideStatus": "PENDING",
        "createdAt": "2026-02-05T12:45:00.000Z",
        "updatedAt": "2026-02-05T12:45:00.000Z"
      }
    ]
  }
}
```

---

## Error Responses

### 500 Internal Server Error
```json
{
  "status": 500,
  "message": "Error fetching ride history: <error details>"
}
```

```json
{
  "status": 500,
  "message": "Error fetching active rides: <error details>"
}
```

---

## Usage Examples

### Example 1: Get all ride history
```bash
GET /api/rides/customer/507f1f77bcf86cd799439011/history
```

### Example 2: Get only completed rides
```bash
GET /api/rides/customer/507f1f77bcf86cd799439011/history?status=COMPLETED
```

### Example 3: Get only cancelled rides
```bash
GET /api/rides/customer/507f1f77bcf86cd799439011/history?status=CANCELLED
```

### Example 4: Get active rides
```bash
GET /api/rides/customer/507f1f77bcf86cd799439011/active
```

---

## Notes

- **Ride History**: Returns rides sorted by pickup date/time in descending order (most recent first)
- **Active Rides**: Only returns rides with status `PENDING`, `ACCEPTED`, or `ONGOING`
- **Population**: Both endpoints populate customer and driver details for easy reference
- **Authentication**: These endpoints should be protected with authentication middleware
- **Authorization**: Verify that the requesting user matches the customerId parameter
