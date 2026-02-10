# 🚗 Ride Start & Location Tracking Guide

## Overview
After a customer accepts a ride request, an OTP-based verification system ensures security, and continuous driver location tracking keeps the customer informed throughout the journey.

---

## 📋 Complete Workflow

### **Step 1: Customer Creates Ride**
```javascript
// Customer creates a ride
socket.emit('ride:create', {
    from: "MG Road, Bangalore",
    to: "Bangalore Airport",
    rideType: "QUICKRIDE",
    vehicleType: "SEDAN",
    passangerCount: 2,
    fare: 500,
    bookedBy: "customerId",
    customerLocation: {
        latitude: 12.9716,
        longitude: 77.5946
    }
});

// Customer receives nearby drivers
socket.on('ride:created', (data) => {
    console.log('Ride ID:', data.ride._id);
    console.log('Nearby drivers:', data.nearbyDrivers.length);
});
```

### **Step 2: Driver Raises Request**
```javascript
// Driver/Owner receives notification
socket.on('ride:new-request', (data) => {
    console.log('New ride available:', data.ride);
});

// Driver creates request
socket.emit('request:create', {
    driver: "driverId",
    vehicle: "vehicleId",
    requestRaisedBy: "ownerId",
    requestedFor: "rideId",
    fare: 500,
    requestStatus: 'PENDING'
});
```

### **Step 3: Customer Accepts Request**
```javascript
// Customer receives request
socket.on('request:new', (data) => {
    console.log('Request ID:', data.request._id);
});

// Customer accepts request
socket.emit('request:accept', {
    requestId: "requestId",
    rideId: "rideId"
});

// ✅ OTP is automatically generated and sent to customer
socket.on('request:accept-success', (data) => {
    console.log('Request accepted');
    console.log('OTP Generated:', data.otpGenerated); // true
    console.log('OTP:', data.startOtp); // e.g., "1234"
    console.log('OTP Expires at:', data.startOtpExpiresAt);
    // Customer can now see the OTP on their screen
});

// Driver receives acceptance
socket.on('request:accepted', (data) => {
    console.log('Your request was accepted!');
    console.log('Ride ID:', data.rideId);
});
```

---

## 🔐 **Step 4: OTP Verification**

### **4.1 Customer Sees OTP**
- When customer accepts request, the OTP is automatically displayed on their screen
- OTP format: 4-digit number (e.g., "1234")
- OTP expires after 24 hours
- Customer can share this OTP with the driver

### **4.2 Driver Retrieves OTP Copy** (Optional)
```javascript
// Driver can also request OTP from system
socket.emit('driver:get-otp', {
    rideId: "rideId",
    driverId: "driverId"
});

// Driver receives OTP
socket.on('driver:otp-received', (data) => {
    console.log('OTP:', data.otp); // e.g., "1234"
    console.log('Expires at:', data.expiresAt);
    console.log('Message:', data.message);
});
```

### **4.3 OTP Exchange**
- Customer has OTP displayed on their screen
- Driver can get their own copy via `driver:get-otp`
- Customer shares OTP verbally or shows screen to driver
- Driver verifies the OTP matches their copy

---

## 🚀 **Step 5: Driver Starts Ride with OTP**

### **5.1 Driver Enters OTP and Starts Ride**
```javascript
// Driver starts ride by providing OTP
socket.emit('ride:start', {
    rideId: "rideId",
    driverId: "driverId",
    otp: "1234" // Must match the generated OTP
});

// Success response
socket.on('ride:start-success', (data) => {
    console.log('Ride started successfully!');
    console.log('Location sharing is now active');
    console.log('Ride:', data.ride);
});

// Error response (wrong OTP)
socket.on('error', (error) => {
    console.log('Error:', error.message);
    // Possible errors:
    // - "Invalid OTP"
    // - "OTP has expired"
    // - "Ride must be in ACCEPTED status to start"
});
```

### **5.2 Customer Receives Notification**
```javascript
socket.on('ride:started', (data) => {
    console.log('Your ride has started!');
    console.log('Driver ID:', data.driverId);
    console.log('Status:', data.status); // "ONGOING"
});
```

---

## 📍 **Step 6: Continuous Location Tracking**

### **6.1 Driver Updates Location Continuously**
```javascript
// Driver's app should update location every 5-10 seconds
setInterval(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            socket.emit('user:update-location', {
                userId: "driverId",
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
        });
    }
}, 5000); // Update every 5 seconds

// Driver receives confirmation
socket.on('user:location-updated', (data) => {
    console.log('Location updated:', data.latitude, data.longitude);
});
```

### **6.2 Customer Receives Real-time Location Updates**
```javascript
// Customer automatically receives driver location during ongoing ride
socket.on('driver:location-update', (data) => {
    console.log('Driver location:', data.latitude, data.longitude);
    console.log('Ride ID:', data.rideId);
    console.log('Driver ID:', data.driverId);
    console.log('Timestamp:', data.timestamp);
    
    // Update map or UI
    updateDriverMarkerOnMap(data.latitude, data.longitude);
});
```

---

## 🏁 **Step 7: Complete Ride**

### **7.1 Driver Completes Ride**
```javascript
socket.emit('ride:complete', {
    rideId: "rideId",
    driverId: "driverId"
});

socket.on('ride:complete-success', (data) => {
    console.log('Ride completed successfully!');
    // Location tracking automatically stops
});
```

### **7.2 Customer Receives Completion**
```javascript
socket.on('ride:completed', (data) => {
    console.log('Ride completed!');
    console.log('Status:', data.status); // "COMPLETED"
    // Location updates automatically stop
});
```

---

## 🔒 Security Features

### **OTP Security**
- ✅ OTP is stored in database with `select: false` (not exposed in queries)
- ✅ OTP expires after 24 hours
- ✅ Both customer and assigned driver can see the OTP
- ✅ Customer sees OTP automatically when accepting request
- ✅ Driver can retrieve their copy via `driver:get-otp`
- ✅ OTP is verified before ride start
- ✅ OTP is deleted after successful verification

### **Location Tracking Security**
- ✅ Location only shared during ONGOING rides
- ✅ Only the customer who booked the ride receives updates
- ✅ Tracking automatically stops when ride completes/cancels
- ✅ Driver must be assigned to the ride

---

## 📱 Complete Example Flow

```javascript
// === CUSTOMER SIDE ===
// 1. Create ride
socket.emit('ride:create', {...});

// 2. Receive and accept request
socket.on('request:new', (data) => {
    socket.emit('request:accept', { requestId: data.request._id, rideId });
});

// 3. Wait for driver to start ride
socket.on('ride:started', (data) => {
    console.log('✓ Ride started!');
});

// 4. Receive continuous location updates
socket.on('driver:location-update', (data) => {
    displayDriverLocation(data.latitude, data.longitude);
});

// 5. Receive completion
socket.on('ride:completed', (data) => {
    console.log('✓ Ride completed!');
});

// === DRIVER SIDE ===
// 1. Create request for ride
socket.emit('request:create', {...});

// 2. Wait for acceptance
socket.on('request:accepted', (data) => {
    console.log('✓ Request accepted!');
});

// 3. Get OTP and share with customer
socket.emit('driver:get-otp', { rideId, driverId });
socket.on('driver:otp-received', (data) => {
    console.log('OTP to share:', data.otp);
    // Tell customer verbally: "Your OTP is " + data.otp
});

// 4. Customer provides OTP back, start ride
socket.emit('ride:start', { rideId, driverId, otp: "1234" });

// 5. Update location continuously
setInterval(() => {
    getCurrentLocation((lat, lon) => {
        socket.emit('user:update-location', { userId: driverId, latitude: lat, longitude: lon });
    });
}, 5000);

// 6. Complete ride
socket.emit('ride:complete', { rideId, driverId });
```

---

## ⚠️ Error Handling

### Common Errors
```javascript
// Wrong OTP
{ message: "Invalid OTP" }

// Expired OTP
{ message: "OTP has expired" }

// Wrong ride status
{ message: "Ride must be in ACCEPTED status to start" }

// Unauthorized driver
{ message: "You are not assigned to this ride" }

// No OTP generated
{ message: "No OTP has been generated for this ride yet" }
```

---

## 🎯 Key Points

1. **OTP is NEVER shown to customer via app** - Only driver can retrieve it
2. **Driver shares OTP verbally** - This ensures the driver and customer are physically present
3. **Location tracking starts automatically** when ride starts with valid OTP
4. **Location tracking stops automatically** when ride completes or is cancelled
5. **Customer receives real-time updates** without manually requesting
6. **OTP expires in 24 hours** but is deleted after successful use

---

## 📊 Socket Events Summary

| Event | Direction | Purpose |
|-------|-----------|---------|
| `driver:get-otp` | Driver → Server | Driver retrieves OTP |
| `driver:otp-received` | Server → Driver | Server sends OTP to driver |
| `ride:request-otp` | Customer → Server | Customer checks if OTP exists |
| `ride:otp-info` | Server → Customer | Server tells customer to ask driver |
| `ride:start` | Driver → Server | Start ride with OTP verification |
| `ride:start-success` | Server → Driver | Ride started confirmation |
| `ride:started` | Server → Customer | Notify customer ride started |
| `user:update-location` | Driver → Server | Driver updates location |
| `driver:location-update` | Server → Customer | Real-time location to customer |
| `ride:complete` | Driver → Server | Complete the ride |
| `ride:completed` | Server → Customer | Notify completion |

---

## 🛠️ Testing Tips

1. Test with expired OTP (wait 24 hours or modify expiry in code)
2. Test with wrong OTP (enter "9999" when actual is "1234")
3. Test location updates during ride (move around or simulate)
4. Test cancellation during ONGOING (location should stop)
5. Check customer doesn't receive OTP through `driver:otp-received`
6. Verify only assigned driver can get OTP

---

## 🔗 Related Files
- `models/rides.js` - Ride schema with OTP fields
- `utils/otp.js` - OTP generation function
- `config/socket.config.js` - All socket event handlers
- `service/ride.service.js` - Ride service with OTP logic
