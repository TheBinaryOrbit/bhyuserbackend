# Quick Ride API Documentation

## Overview
Quick Ride API allows users to save their frequently used pickup and drop locations for quick ride booking with a single click.

---

## 1. Add Quick Ride

**Route:** `POST /api/quickride/add`

**Request Body:**
```json
{
  "to": "Airport, Terminal 2",
  "from": "Home, 123 Main Street",
  "customerId": "507f1f77bcf86cd799439011",
  "distance": 15.5,
  "tag": "Airport Trip"
}
```

**Response:**
```json
{
  "status": 201,
  "message": "Quick ride added successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "to": "Airport, Terminal 2",
    "from": "Home, 123 Main Street",
    "customerId": "507f1f77bcf86cd799439011",
    "distance": 15.5,
    "tag": "Airport Trip",
    "createdAt": "2026-02-05T10:30:00.000Z",
    "updatedAt": "2026-02-05T10:30:00.000Z"
  }
}
```

---

## 2. Get All Quick Rides

**Route:** `GET /api/quickride?customerId={customerId}`

**Query Parameters:**
- `customerId` (required): Customer ID to fetch quick rides

**Response:**
```json
{
  "status": 200,
  "message": "Quick rides fetched successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "to": "Airport, Terminal 2",
      "from": "Home, 123 Main Street",
      "customerId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "9876543210"
      },
      "distance": 15.5,
      "tag": "Airport Trip",
      "createdAt": "2026-02-05T10:30:00.000Z",
      "updatedAt": "2026-02-05T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "to": "Office, Tech Park",
      "from": "Home, 123 Main Street",
      "customerId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "9876543210"
      },
      "distance": 8.2,
      "tag": "Daily Commute",
      "createdAt": "2026-02-05T11:00:00.000Z",
      "updatedAt": "2026-02-05T11:00:00.000Z"
    }
  ]
}
```

---

## 3. Get Quick Ride by ID

**Route:** `GET /api/quickride/:id`

**Path Parameters:**
- `id` (required): Quick Ride ID

**Response:**
```json
{
  "status": 200,
  "message": "Quick ride fetched successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "to": "Airport, Terminal 2",
    "from": "Home, 123 Main Street",
    "customerId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "distance": 15.5,
    "tag": "Airport Trip",
    "createdAt": "2026-02-05T10:30:00.000Z",
    "updatedAt": "2026-02-05T10:30:00.000Z"
  }
}
```

---

## 4. Update Quick Ride

**Route:** `PATCH /api/quickride/:id`

**Path Parameters:**
- `id` (required): Quick Ride ID

**Request Body:** (All fields are optional)
```json
{
  "to": "Airport, Terminal 1",
  "from": "New Home, 456 Oak Avenue",
  "distance": 16.0,
  "tag": "Updated Airport Trip"
}
```

**Response:**
```json
{
  "status": 200,
  "message": "Quick ride updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "to": "Airport, Terminal 1",
    "from": "New Home, 456 Oak Avenue",
    "customerId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "distance": 16.0,
    "tag": "Updated Airport Trip",
    "createdAt": "2026-02-05T10:30:00.000Z",
    "updatedAt": "2026-02-05T12:15:00.000Z"
  }
}
```

---

## 5. Delete Quick Ride

**Route:** `DELETE /api/quickride/:id`

**Path Parameters:**
- `id` (required): Quick Ride ID

**Response:**
```json
{
  "status": 200,
  "message": "Quick ride deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "to": "Airport, Terminal 2",
    "from": "Home, 123 Main Street",
    "customerId": "507f1f77bcf86cd799439011",
    "distance": 15.5,
    "tag": "Airport Trip",
    "createdAt": "2026-02-05T10:30:00.000Z",
    "updatedAt": "2026-02-05T10:30:00.000Z"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": 400,
  "message": "All fields are required"
}
```

### 404 Not Found
```json
{
  "status": 404,
  "message": "Quick ride not found"
}
```

### 500 Internal Server Error
```json
{
  "status": 500,
  "message": "Error message details"
}
```
