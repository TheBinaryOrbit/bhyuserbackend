# Driver Availability Rules - Frontend Implementation Guide

## Overview
This document outlines the driver availability rules that have been implemented in the backend and provides guidance for frontend implementation.

---

## Backend Rules (Implemented)

### Rule 1: QUICKRIDE Accepted
**When a driver has an ACCEPTED or ONGOING QUICKRIDE:**
- ❌ **Cannot accept ANY new rides** (QUICKRIDE or OUTSTATION)
- The driver is completely unavailable until the QUICKRIDE is completed

**Status Blocking:** `ACCEPTED`, `ONGOING`

### Rule 2: OUTSTATION Accepted
**When a driver has an ACCEPTED or ONGOING OUTSTATION:**
- ✅ **CAN accept QUICKRIDE** (at any time)
- ✅ **CAN accept OUTSTATION** (on different dates)
- ❌ **CANNOT accept OUTSTATION** (on the same date)

**Status Blocking:** `ACCEPTED`, `ONGOING`

---

## Frontend Implementation Checklist

### 1. Ride List Display (Driver View)

#### Visual Indicators
When displaying available rides to drivers, show availability status:

```javascript
// Pseudo-code example
const getRideAvailabilityStatus = (ride, driverActiveRides) => {
  // Check if driver has active QUICKRIDE
  const hasActiveQuickRide = driverActiveRides.some(
    r => r.rideType === 'QUICKRIDE' && 
    ['ACCEPTED', 'ONGOING'].includes(r.rideStatus)
  );
  
  if (hasActiveQuickRide) {
    return {
      available: false,
      reason: 'You have an active QUICKRIDE',
      showWarning: true
    };
  }
  
  // Check if driver has active OUTSTATION
  const activeOutstation = driverActiveRides.filter(
    r => r.rideType === 'OUTSTATION' && 
    ['ACCEPTED', 'ONGOING'].includes(r.rideStatus)
  );
  
  if (activeOutstation.length > 0 && ride.rideType === 'OUTSTATION') {
    // Check date conflict
    const rideDate = new Date(ride.pickUpDateTime).toDateString();
    const hasConflict = activeOutstation.some(
      r => new Date(r.pickUpDateTime).toDateString() === rideDate
    );
    
    if (hasConflict) {
      return {
        available: false,
        reason: 'You already have an OUTSTATION ride on this date',
        showWarning: true
      };
    }
  }
  
  return { available: true };
};
```

#### UI Display
- **Available rides:** Show with green badge or normal styling
- **Unavailable rides:** 
  - Display with gray overlay or opacity: 0.5
  - Add a "🚫 Not Available" badge
  - Show reason in tooltip or subtitle
  - Disable "Request Ride" button
  - Optional: Hide completely (but showing grayed out is better UX)

### 2. Request Creation Flow

#### Client-Side Validation
Before sending `request:create` socket event:

```javascript
// Check driver availability client-side
const canRequestRide = (selectedDriver, ride) => {
  const { available, reason } = getRideAvailabilityStatus(ride, selectedDriver.activeRides);
  
  if (!available) {
    showToast('error', reason);
    return false;
  }
  
  return true;
};

// In your request ride handler
const handleRequestRide = (driver, vehicle, ride) => {
  if (!canRequestRide(driver, ride)) {
    return; // Prevent request
  }
  
  // Proceed with socket emission
  socket.emit('request:create', {
    driver: driver._id,
    vehicle: vehicle._id,
    requestedFor: ride._id,
    // ... other data
  });
};
```

#### Server Response Handling
The backend will send validation errors. Handle them:

```javascript
// Listen for failed request creation
socket.on('request:create-failed', (response) => {
  if (response.unavailable) {
    // Driver is not available
    showNotification({
      type: 'warning',
      title: 'Driver Unavailable',
      message: response.message,
      duration: 5000
    });
    
    // Optionally refresh driver availability status
    refreshDriverStatus();
  } else {
    // Other error
    showNotification({
      type: 'error',
      title: 'Request Failed',
      message: response.message
    });
  }
});
```

### 3. Driver Status Dashboard

Create a clear status indicator for drivers:

```javascript
const DriverStatusBadge = ({ driver }) => {
  const activeRides = driver.activeRides.filter(
    r => ['ACCEPTED', 'ONGOING'].includes(r.rideStatus)
  );
  
  if (activeRides.length === 0) {
    return <Badge color="green">Available</Badge>;
  }
  
  const hasQuickRide = activeRides.some(r => r.rideType === 'QUICKRIDE');
  
  if (hasQuickRide) {
    return (
      <Badge color="red">
        Busy - QUICKRIDE Active
      </Badge>
    );
  }
  
  const outstationRides = activeRides.filter(r => r.rideType === 'OUTSTATION');
  
  if (outstationRides.length > 0) {
    const dates = outstationRides.map(
      r => new Date(r.pickUpDateTime).toLocaleDateString()
    ).join(', ');
    
    return (
      <Badge color="yellow">
        Partially Available - OUTSTATION on {dates}
      </Badge>
    );
  }
  
  return <Badge color="green">Available</Badge>;
};
```

### 4. Ride Notification Filtering

**Note:** The backend already filters notifications, but you can add client-side filtering for better UX:

```javascript
socket.on('ride:new', ({ ride, distance, message }) => {
  // Optional: Double-check availability on client
  const { available, reason } = getRideAvailabilityStatus(
    ride, 
    currentDriver.activeRides
  );
  
  if (!available) {
    console.log(`Ride ${ride._id} filtered: ${reason}`);
    return; // Skip notification
  }
  
  // Show notification
  showRideNotification(ride, distance, message);
});
```

### 5. Active Rides Management

Maintain a real-time list of driver's active rides:

```javascript
// Store in state/context
const [driverActiveRides, setDriverActiveRides] = useState([]);

// Update when ride status changes
socket.on('ride:accepted', ({ ride }) => {
  setDriverActiveRides(prev => [...prev, ride]);
  // Refresh available rides list
  refreshAvailableRides();
});

socket.on('ride:completed', ({ rideId }) => {
  setDriverActiveRides(prev => prev.filter(r => r._id !== rideId));
  // Refresh available rides list
  refreshAvailableRides();
});

socket.on('ride:cancelled', ({ rideId }) => {
  setDriverActiveRides(prev => prev.filter(r => r._id !== rideId));
  // Refresh available rides list
  refreshAvailableRides();
});
```

---

## User Experience Recommendations

### 1. Clear Communication
Always explain WHY a ride is unavailable:
- "You have an active QUICKRIDE. Complete it to accept new rides."
- "You already have an OUTSTATION ride on this date. Choose a different date."
- "You can still accept QUICKRIDE rides while your OUTSTATION ride is in progress."

### 2. Status Indicators
Use clear visual indicators:
- 🟢 **Green:** Fully available
- 🟡 **Yellow:** Partially available (OUTSTATION active, can take QUICKRIDE)
- 🔴 **Red:** Unavailable (QUICKRIDE active)

### 3. Proactive UI
- Show driver availability status prominently in the dashboard
- Display active rides with countdown timers
- Show "Return to Active Ride" button when applicable

### 4. Error Prevention
- Disable unavailable options instead of showing errors
- Use tooltips to explain why something is disabled
- Provide alternative actions (e.g., "View Active Ride" instead of "Request")

---

## API Endpoints Used

### Get Driver Active Rides
```javascript
// REST API (if available)
GET /api/rides/driver/:driverId?status=ACCEPTED,ONGOING

// Socket.io
socket.emit('rides:get-driver-active', { driverId });
socket.on('rides:driver-active', ({ rides }) => {
  // Process active rides
});
```

---

## Testing Scenarios

### Scenario 1: QUICKRIDE Block
1. Driver accepts a QUICKRIDE
2. Verify: No new ride notifications appear
3. Verify: All rides in list show as unavailable
4. Complete QUICKRIDE
5. Verify: Rides become available again

### Scenario 2: OUTSTATION Partial Availability
1. Driver accepts OUTSTATION for tomorrow
2. Verify: QUICKRIDE rides remain available
3. Verify: OUTSTATION rides for tomorrow are blocked
4. Verify: OUTSTATION rides for other dates remain available

### Scenario 3: Multiple OUTSTATION Rides
1. Driver accepts OUTSTATION for Monday
2. Driver accepts another OUTSTATION for Wednesday
3. Verify: Can still accept QUICKRIDE
4. Verify: Cannot accept OUTSTATION on Monday or Wednesday
5. Verify: Can accept OUTSTATION on other days

---

## Common Pitfalls

### ❌ Don't:
- Show available rides to drivers who can't accept them
- Allow request submission without validation
- Hide the reason why a ride is unavailable

### ✅ Do:
- Show all rides but clearly indicate availability
- Validate on both client and server side
- Provide clear, actionable feedback
- Keep driver status updated in real-time
- Handle edge cases (ride cancelled while viewing, etc.)

---

## Socket Events Reference

### Listening (Server → Client)
```javascript
socket.on('ride:new', ({ ride, distance, message }) => { });
socket.on('request:create-failed', ({ success, message, unavailable }) => { });
socket.on('ride:accepted', ({ ride }) => { });
socket.on('ride:completed', ({ rideId }) => { });
socket.on('ride:cancelled', ({ rideId }) => { });
```

### Emitting (Client → Server)
```javascript
socket.emit('request:create', { driver, vehicle, requestedFor, ... });
socket.emit('rides:get-available', { filters });
```

---

## Summary

**Backend handles:**
- Filtering ride broadcasts based on driver availability
- Validating request creation
- Returning appropriate error messages

**Frontend should handle:**
- Displaying availability status clearly
- Client-side validation for better UX
- Maintaining real-time driver status
- Providing helpful user feedback
- Preventing invalid actions proactively

---

## Questions?

If you need clarification on any of these rules or need additional backend support, please contact the backend team.

**Updated:** February 26, 2026
