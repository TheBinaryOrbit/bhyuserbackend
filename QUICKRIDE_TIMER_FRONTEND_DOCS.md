# QuickRide Timer - Frontend Documentation

## Overview
QuickRide bookings have a **5-minute timer** that starts when the ride is created. The timer persists even if the customer disconnects and reconnects. The backend sends real-time updates every 10 seconds.

---

## Socket Connection

### Customer Connection
```javascript
import io from 'socket.io-client';

const socket = io('YOUR_BACKEND_URL', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connect as customer
socket.emit('customer:connect', { customerId: 'YOUR_CUSTOMER_ID' });

// Listen for connection confirmation
socket.on('customer:connected', (data) => {
  console.log('Connected:', data);
  // { success: true, message: '...', customerId: '...', socketId: '...' }
});
```

---

## Timer Events

### 1. Automatic Timer Updates (Every 10 seconds)
When a quickride is created, you'll automatically receive timer updates:

```javascript
socket.on('ride:timer-update', (data) => {
  console.log('Timer Update:', data);
  // {
  //   rideId: '507f1f77bcf86cd799439011',
  //   remainingSeconds: 285,  // Time left in seconds
  //   expiresAt: '2026-03-03T10:05:00.000Z'  // ISO timestamp
  // }
  
  // Update your UI with remaining time
  const minutes = Math.floor(data.remainingSeconds / 60);
  const seconds = data.remainingSeconds % 60;
  console.log(`Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`);
});
```

### 2. Ride Creation Response
When you create a ride, you receive the initial timeout value:

```javascript
socket.emit('ride:create', rideData);

socket.on('ride:created', (data) => {
  console.log('Ride created:', data);
  // {
  //   success: true,
  //   ride: { _id: '...', rideType: 'QUICKRIDE', ... },
  //   nearbyDrivers: [...],
  //   timeout: 300000,  // 5 minutes in milliseconds
  //   searchRadius: 10
  // }
  
  // Join the ride room to receive updates
  socket.emit('ride:subscribe', { rideId: data.ride._id });
});
```

### 3. Manual Timer Query (On Reconnection)
Get the current remaining time for a specific ride:

```javascript
// Request remaining time
socket.emit('ride:get-remaining-time', { rideId: 'YOUR_RIDE_ID' });

// Listen for response
socket.on('ride:remaining-time', (data) => {
  console.log('Remaining time:', data);
  // {
  //   rideId: '507f1f77bcf86cd799439011',
  //   remainingSeconds: 180,
  //   expiresAt: '2026-03-03T10:05:00.000Z',
  //   rideStatus: 'PENDING'
  // }
  
  // Update UI
  updateTimerDisplay(data.remainingSeconds);
});

// Handle cases where timer doesn't apply
socket.on('ride:no-timer', (data) => {
  console.log('No timer for this ride:', data);
  // { rideId: '...', message: 'Timer is only active for pending rides' }
});

socket.on('ride:timer-expired', (data) => {
  console.log('Timer expired:', data);
  // { rideId: '...', message: 'Ride timer has expired' }
});
```

### 4. Ride Timeout/Default
When the 5-minute timer expires:

```javascript
socket.on('ride:timeout', (data) => {
  console.log('Ride timed out:', data);
  // {
  //   rideId: '507f1f77bcf86cd799439011',
  //   message: 'Ride defaulted - No driver found within 5 minutes',
  //   status: 'DEFAULTED',
  //   rideType: 'QUICKRIDE'
  // }
  
  // Show timeout message to user
  showNotification('No driver found. Please try booking again.');
});
```

### 5. Ride Accepted (Timer Stops)
When a driver is accepted, the timer automatically stops:

```javascript
socket.on('ride:accepted', (data) => {
  console.log('Ride accepted:', data);
  // Timer stops automatically - no more timer-update events
  // Hide timer from UI
  hideTimer();
});
```

---

## Complete React Example

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

const QuickRideTimer = ({ rideId, customerId }) => {
  const [socket, setSocket] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [rideStatus, setRideStatus] = useState('PENDING');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_SOCKET_URL);
    
    // Connect as customer
    newSocket.emit('customer:connect', { customerId });
    
    // Listen for automatic timer updates
    newSocket.on('ride:timer-update', (data) => {
      if (data.rideId === rideId) {
        setRemainingSeconds(data.remainingSeconds);
      }
    });
    
    // Listen for ride timeout
    newSocket.on('ride:timeout', (data) => {
      if (data.rideId === rideId) {
        setRideStatus('DEFAULTED');
        alert('Ride timed out - No driver found');
      }
    });
    
    // Listen for ride accepted
    newSocket.on('ride:accepted', (data) => {
      if (data.rideId === rideId) {
        setRideStatus('ACCEPTED');
      }
    });
    
    // On connection, request current remaining time
    newSocket.on('customer:connected', () => {
      newSocket.emit('ride:get-remaining-time', { rideId });
    });
    
    newSocket.on('ride:remaining-time', (data) => {
      if (data.rideId === rideId) {
        setRemainingSeconds(data.remainingSeconds);
        setRideStatus(data.rideStatus);
      }
    });
    
    setSocket(newSocket);
    
    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [rideId, customerId]);

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (rideStatus !== 'PENDING' || remainingSeconds === null) {
    return null; // Don't show timer if ride is not pending
  }

  return (
    <div className="timer-container">
      <h3>Finding a driver...</h3>
      <div className="timer-display">
        <span className="timer-value">{formatTime(remainingSeconds)}</span>
        <span className="timer-label">remaining</span>
      </div>
      {remainingSeconds < 60 && (
        <p className="timer-warning">Hurry! Less than a minute left!</p>
      )}
    </div>
  );
};

export default QuickRideTimer;
```

---

## Reconnection Handling

The timer continues running even if the customer disconnects. When they reconnect:

```javascript
socket.on('customer:connected', (data) => {
  console.log('Reconnected successfully');
  
  // Fetch all pending rides to get their remaining times
  // This happens automatically on the backend
  // You'll receive ride:timer-update events for any active timers
  
  // OR manually query for specific ride
  if (currentRideId) {
    socket.emit('ride:get-remaining-time', { rideId: currentRideId });
  }
});
```

---

## Important Notes

1. **QUICKRIDE Only**: Timer is ONLY active for `QUICKRIDE` type rides, NOT for `OUTSTATION` rides.

2. **5-Minute Duration**: The timer is set to **300 seconds (5 minutes)** by default.

3. **Update Frequency**: Timer updates are sent every **10 seconds**.

4. **Automatic Cleanup**: Timer stops automatically when:
   - Ride is accepted by a driver
   - Ride is cancelled
   - Timer expires (ride defaults)

5. **Persistence**: The timer runs on the server, so:
   - It continues even if user closes the app
   - On reconnection, user gets the current remaining time
   - No client-side timer management needed

6. **Subscribe to Ride Room**: Make sure to join the ride room to receive updates:
   ```javascript
   socket.emit('ride:subscribe', { rideId });
   ```

---

## Event Summary Table

| Event Name | Direction | When | Data Structure |
|-----------|-----------|------|----------------|
| `ride:timer-update` | Server → Client | Every 10s during pending ride | `{ rideId, remainingSeconds, expiresAt }` |
| `ride:get-remaining-time` | Client → Server | Manual query | `{ rideId }` |
| `ride:remaining-time` | Server → Client | Response to query | `{ rideId, remainingSeconds, expiresAt, rideStatus }` |
| `ride:timeout` | Server → Client | When timer expires | `{ rideId, message, status, rideType }` |
| `ride:no-timer` | Server → Client | When timer not applicable | `{ rideId, message }` |
| `ride:timer-expired` | Server → Client | When querying expired timer | `{ rideId, message }` |

---

## Testing Tips

1. **Test Reconnection**: 
   - Create a ride
   - Disconnect from socket
   - Wait 1-2 minutes
   - Reconnect
   - Verify you receive the updated remaining time

2. **Test Timer Expiry**:
   - Create a ride with no drivers accepting
   - Wait for 5 minutes
   - Verify `ride:timeout` event is received

3. **Test Multiple Rides**:
   - Ensure timer updates filter by `rideId`
   - Multiple pending rides should each have their own timer

---

## Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // Handle errors appropriately
  showErrorMessage(error.message);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Retry connection or show offline message
});
```

---

For any issues or questions, contact the backend team.
