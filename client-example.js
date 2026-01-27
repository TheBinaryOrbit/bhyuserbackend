/**
 * WebSocket Client Example for Ride Booking System
 * 
 * This file demonstrates how to integrate the ride booking system
 * in your frontend application (React, React Native, etc.)
 */

import io from 'socket.io-client';

// Configuration
const SOCKET_URL = 'http://localhost:5000';

class RideBookingClient {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.userType = null;
  }

  /**
   * Initialize socket connection for a driver/owner
   */
  connectAsUser(userId, userType) {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.userId = userId;
    this.userType = userType;

    // Connect event
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.socket.emit('user:connect', { userId, userType });
    });

    // Connection confirmed
    this.socket.on('user:connected', (data) => {
      console.log('User connected successfully:', data);
    });

    // Setup listeners
    this.setupUserListeners();
  }

  /**
   * Initialize socket connection for a customer
   */
  connectAsCustomer(customerId) {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.userId = customerId;

    // Connect event
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.socket.emit('customer:connect', { customerId });
    });

    // Connection confirmed
    this.socket.on('customer:connected', (data) => {
      console.log('Customer connected successfully:', data);
    });

    // Setup listeners
    this.setupCustomerListeners();
  }

  /**
   * Setup listeners for drivers/owners
   */
  setupUserListeners() {
    // New ride available
    this.socket.on('ride:new-request', (data) => {
      console.log('New ride available:', data);
      const { ride, timeout } = data;
      
      // Show notification to driver
      this.showNotification('New Ride Available', {
        from: ride.from,
        to: ride.to,
        fare: ride.fare,
        distance: ride.distanceKm,
        vehicleType: ride.vehicleType
      });

      // Auto-dismiss after timeout
      setTimeout(() => {
        console.log('Ride request expired');
      }, timeout);
    });

    // Request accepted by customer
    this.socket.on('request:accepted', (data) => {
      console.log('Your request was accepted!', data);
      this.showNotification('Request Accepted', {
        message: 'Customer accepted your request!'
      });
    });

    // Request declined by customer
    this.socket.on('request:declined', (data) => {
      console.log('Request declined:', data);
      this.showNotification('Request Declined', {
        reason: data.reason
      });
    });

    // Ride cancelled by customer
    this.socket.on('ride:cancelled-by-customer', (data) => {
      console.log('Ride cancelled:', data);
      this.showNotification('Ride Cancelled', {
        message: 'Customer has cancelled the ride'
      });
    });

    // Status updates
    this.socket.on('user:status-updated', (data) => {
      console.log('Status updated:', data);
    });

    // Location updated
    this.socket.on('user:location-updated', (data) => {
      console.log('Location updated:', data);
    });

    // Request created confirmation
    this.socket.on('request:created', (data) => {
      console.log('Request submitted:', data);
    });
  }

  /**
   * Setup listeners for customers
   */
  setupCustomerListeners() {
    // Ride created successfully
    this.socket.on('ride:created', (data) => {
      console.log('Ride created:', data);
      const { ride, nearbyDrivers, timeout } = data;
      
      // Display nearby drivers
      this.displayNearbyDrivers(nearbyDrivers);
      
      // Show timeout countdown
      this.startTimeoutCountdown(timeout);
    });

    // New request from driver
    this.socket.on('request:new', (data) => {
      console.log('New request received:', data);
      const { request } = data;
      
      // Show request notification with driver details
      this.showRequestNotification(request);
    });

    // Request accepted confirmation
    this.socket.on('request:accept-success', (data) => {
      console.log('Request accepted successfully:', data);
      this.showNotification('Driver Assigned', {
        driver: data.request.driver.name,
        vehicle: data.request.vehicle
      });
    });

    // Request declined confirmation
    this.socket.on('request:decline-success', (data) => {
      console.log('Request declined:', data);
    });

    // Fare updated
    this.socket.on('ride:fare-updated', (data) => {
      console.log('Fare updated:', data);
      this.updateFareDisplay(data.newFare);
    });

    // Ride started
    this.socket.on('ride:started', (data) => {
      console.log('Ride started:', data);
      this.showNotification('Ride Started', {
        message: 'Driver has started the ride'
      });
      this.updateRideStatus('ongoing');
    });

    // Ride completed
    this.socket.on('ride:completed', (data) => {
      console.log('Ride completed:', data);
      this.showNotification('Ride Completed', {
        message: 'Your ride has been completed'
      });
      this.updateRideStatus('completed');
    });

    // Ride cancelled
    this.socket.on('ride:cancelled', (data) => {
      console.log('Ride cancelled:', data);
      this.updateRideStatus('cancelled');
    });

    // Ride timeout (no driver found)
    this.socket.on('ride:timeout', (data) => {
      console.log('Ride timeout:', data);
      this.showNotification('No Driver Found', {
        message: data.message
      });
    });

    // Ride request accepted (for subscription)
    this.socket.on('ride:request-accepted', (data) => {
      console.log('A request was accepted for this ride:', data);
    });

    // Cancel success
    this.socket.on('ride:cancel-success', (data) => {
      console.log('Ride cancelled successfully:', data);
    });
  }

  /**
   * Toggle online/offline status (for drivers)
   */
  toggleOnlineStatus(isOnline) {
    if (!this.socket || !this.userId) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('user:toggle-status', {
      userId: this.userId,
      isOnline
    });
  }

  /**
   * Update location (for drivers)
   */
  updateLocation(latitude, longitude) {
    if (!this.socket || !this.userId) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('user:update-location', {
      userId: this.userId,
      latitude,
      longitude
    });
  }

  /**
   * Create a new ride (for customers)
   */
  createRide(rideData, customerLocation) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('ride:create', {
      ...rideData,
      customerLocation
    });
  }

  /**
   * Create a request for a ride (for drivers)
   */
  createRequest(requestData) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('request:create', requestData);
  }

  /**
   * Accept a request (for customers)
   */
  acceptRequest(requestId, rideId) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('request:accept', { requestId, rideId });
  }

  /**
   * Decline a request (for customers)
   */
  declineRequest(requestId, rideId, reason) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('request:decline', { requestId, rideId, reason });
  }

  /**
   * Update ride fare (for customers)
   */
  updateRideFare(rideId, newFare) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('ride:update-fare', { rideId, newFare });
  }

  /**
   * Cancel ride (for customers)
   */
  cancelRide(rideId, customerId) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('ride:cancel', { rideId, customerId });
  }

  /**
   * Start ride (for drivers)
   */
  startRide(rideId, driverId) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('ride:start', { rideId, driverId });
  }

  /**
   * Complete ride (for drivers)
   */
  completeRide(rideId, driverId) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('ride:complete', { rideId, driverId });
  }

  /**
   * Subscribe to ride updates
   */
  subscribeToRide(rideId) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('ride:subscribe', { rideId });
  }

  /**
   * Unsubscribe from ride updates
   */
  unsubscribeFromRide(rideId) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('ride:unsubscribe', { rideId });
  }

  /**
   * Setup error listener
   */
  onError(callback) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.userType = null;
    }
  }

  // Helper methods (implement based on your UI framework)
  showNotification(title, data) {
    console.log(`Notification: ${title}`, data);
    // Implement your notification logic here
  }

  displayNearbyDrivers(drivers) {
    console.log('Nearby drivers:', drivers);
    // Implement your UI logic here
  }

  startTimeoutCountdown(timeout) {
    console.log(`Timeout in ${timeout}ms`);
    // Implement countdown UI here
  }

  showRequestNotification(request) {
    console.log('New request:', request);
    // Show driver and vehicle details
  }

  updateFareDisplay(newFare) {
    console.log('New fare:', newFare);
    // Update UI
  }

  updateRideStatus(status) {
    console.log('Ride status:', status);
    // Update UI
  }
}

// Usage Examples

// ============ Driver/Owner Usage ============
const driverClient = new RideBookingClient();

// Connect as driver
driverClient.connectAsUser('USER_ID_HERE', 'DRIVER');

// Toggle online status
driverClient.toggleOnlineStatus(true);

// Update location (call this periodically)
setInterval(() => {
  // Get current location from GPS
  const latitude = 12.9716;
  const longitude = 77.5946;
  driverClient.updateLocation(latitude, longitude);
}, 30000); // Every 30 seconds

// Create request for a ride
driverClient.createRequest({
  driver: 'DRIVER_ID',
  vehicle: 'VEHICLE_ID',
  requestRaisedBy: 'USER_ID',
  requestedFor: 'RIDE_ID',
  fare: 500,
  requestStatus: 'PENDING'
});

// Start ride
driverClient.startRide('RIDE_ID', 'DRIVER_ID');

// Complete ride
driverClient.completeRide('RIDE_ID', 'DRIVER_ID');

// ============ Customer Usage ============
const customerClient = new RideBookingClient();

// Connect as customer
customerClient.connectAsCustomer('CUSTOMER_ID_HERE');

// Create a ride
customerClient.createRide({
  to: 'Airport',
  from: 'Hotel Downtown',
  pickUpDateTime: new Date(),
  vehicleType: 'SEDAN',
  passangerCount: 2,
  fare: 500,
  rideType: 'QUICKRIDE',
  bookedBy: 'CUSTOMER_ID',
  estimatedDistance: 15 // km
}, {
  latitude: 12.9716,
  longitude: 77.5946
});

// Accept a request
customerClient.acceptRequest('REQUEST_ID', 'RIDE_ID');

// Decline a request
customerClient.declineRequest('REQUEST_ID', 'RIDE_ID', 'Not suitable');

// Update fare
customerClient.updateRideFare('RIDE_ID', 600);

// Cancel ride
customerClient.cancelRide('RIDE_ID', 'CUSTOMER_ID');

// Subscribe to ride updates
customerClient.subscribeToRide('RIDE_ID');

// Error handling
driverClient.onError((error) => {
  console.error('Socket error:', error);
  // Show error to user
});

export default RideBookingClient;
