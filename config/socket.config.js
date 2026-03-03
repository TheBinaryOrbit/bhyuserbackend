import { Server } from 'socket.io';
import { 
    createRide, 
    updateUserOnlineStatus, 
    updateUserLocation,
    getRideById,
    updateRideStatus,
    cancelRide,
    updateRideFare,
    getAllRides,
    getPendingRidesByCustomer,
    defaultRide,
    checkUserDriversAvailability,
    checkDriverAvailability
} from '../service/ride.service.js';
import { 
    createRequest,
    getRequestsByRide,
    approveRequest,
    declineRequest,
    cancelRequest
} from '../service/request.service.js';
import { generalNotification } from './notification.config.js';
import { User } from '../models/user.model.js';
import { Ride } from '../models/rides.js';
import { generateRideOTP } from '../utils/otp.js';

// Store active socket connections: userId -> socketId
const activeConnections = new Map();
// Store ride timeouts: rideId -> timeoutId
const rideTimeouts = new Map();
// Store customer sockets by ride: rideId -> customerId
const rideCustomerMap = new Map();
// Store ongoing rides for location tracking: rideId -> { driverId, customerId }
const ongoingRides = new Map();
// Store timer intervals for emitting remaining time: rideId -> intervalId
const rideTimerIntervals = new Map();

/**
 * Calculate remaining time for a ride
 * @param {Date} expiresAt - When the ride expires
 * @returns {Object} { remainingMs, remainingSeconds, isExpired }
 */
const calculateRemainingTime = (expiresAt) => {
    const now = new Date();
    const remainingMs = expiresAt - now;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    return {
        remainingMs,
        remainingSeconds,
        isExpired: remainingMs <= 0
    };
};

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
export const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Owner connects (user who owns drivers and vehicles)
        socket.on('user:connect', async ({ userId, userType }) => {
            try {
                activeConnections.set(userId, socket.id);
                socket.userId = userId;
                socket.userType = userType || 'OWNER';  // Default to OWNER
                socket.join(`user:${userId}`);

                await updateUserOnlineStatus(userId, true, socket.id);
                
                socket.emit('user:connected', { 
                    success: true, 
                    message: 'Connected successfully as owner',
                    userId,
                    socketId: socket.id,
                    userType: socket.userType
                });

                console.log(`Owner ${userId} connected with socket ${socket.id}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Customer connects
        socket.on('customer:connect', async ({ customerId }) => {
            try {
                activeConnections.set(customerId, socket.id);
                socket.customerId = customerId;
                socket.join(`customer:${customerId}`);

                socket.emit('customer:connected', { 
                    success: true, 
                    message: 'Customer connected successfully',
                    customerId,
                    socketId: socket.id
                });

                // Check for any pending quickrides and send remaining time
                try {
                    const pendingRides = await getPendingRidesByCustomer(customerId);
                    for (const ride of pendingRides) {
                        if (ride.rideType === 'QUICKRIDE' && ride.rideStatus === 'PENDING' && ride.expiresAt) {
                            const { remainingSeconds, isExpired } = calculateRemainingTime(ride.expiresAt);
                            
                            if (!isExpired) {
                                socket.emit('ride:timer-update', {
                                    rideId: ride._id,
                                    remainingSeconds,
                                    expiresAt: ride.expiresAt,
                                    message: 'Reconnected - timer still active'
                                });
                                console.log(`Sent timer update to reconnected customer ${customerId} for ride ${ride._id}: ${remainingSeconds}s remaining`);
                            }
                        }
                    }
                } catch (rideError) {
                    console.error('Error checking pending rides on reconnect:', rideError);
                }

                console.log(`Customer ${customerId} connected with socket ${socket.id}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Owner subscribes to ride updates (join rides room)
        socket.on('rides:subscribe', async ({ city }) => {
            try {
                if (city) {
                    socket.join(`rides:${city}`);
                    socket.city = city;
                }
                socket.join('rides:all');

                socket.emit('rides:subscribed', {
                    success: true,
                    message: 'Subscribed to ride updates',
                    city: city || 'all'
                });

                console.log(`Socket ${socket.id} subscribed to rides${city ? ` in ${city}` : ''}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Get available rides
        socket.on('rides:get-available', async ({ filters = {} }) => {
            try {
                // Default filter to show only PENDING rides
                const rideFilters = {
                    rideStatus: filters.rideStatus || 'PENDING',
                    ...filters
                };

                const rides = await getAllRides(rideFilters);

                socket.emit('rides:list', {
                    success: true,
                    rides: rides.map(ride => ({
                        _id: ride._id,
                        from: ride.from,
                        to: ride.to,
                        pickUpDateTime: ride.pickUpDateTime,
                        vehicleType: ride.vehicleType,
                        passangerCount: ride.passangerCount,
                        fare: ride.fare,
                        rideType: ride.rideType,
                        rideStatus: ride.rideStatus,
                        estimatedDistance: ride.estimatedDistance,
                        isLater: ride.isLater,
                        bookedBy: ride.bookedBy ? {
                            _id: ride.bookedBy._id,
                            name: ride.bookedBy.name,
                            phoneNumber: ride.bookedBy.phoneNumber
                        } : null
                    })),
                    count: rides.length
                });

                console.log(`Sent ${rides.length} rides to socket ${socket.id}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // User toggles online/offline status
        socket.on('user:toggle-status', async ({ userId, isOnline }) => {
            try {
                await updateUserOnlineStatus(userId, isOnline, isOnline ? socket.id : null);
                
                socket.emit('user:status-updated', { 
                    success: true, 
                    isOnline,
                    message: `Status updated to ${isOnline ? 'online' : 'offline'}`
                });

                console.log(`User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Update user location
        socket.on('user:update-location', async ({ userId, latitude, longitude , rideId }) => {
            try {
                await updateUserLocation(userId, latitude, longitude);
                
                console.log('═══════════════════════════════════════════════════════');
                console.log('📍 LOCATION UPDATE RECEIVED');
                console.log(`Driver ID:  ${userId}`);
                console.log(`Latitude:   ${latitude.toFixed(6)}`);
                console.log(`Longitude:  ${longitude.toFixed(6)}`);
                console.log(`Ride ID:    ${rideId || 'N/A'}`);
                console.log(`Time:       ${new Date().toISOString()}`);
                
                socket.emit('user:location-updated', { 
                    success: true,
                    latitude,
                    longitude 
                });

                // If rideId is provided, emit location to the customer who booked the ride
                if (rideId) {
                    try {
                        const ride = await getRideById(rideId);
                        
                        if (ride && (ride.rideStatus === 'ACCEPTED' || ride.rideStatus === 'ONGOING')) {
                            const customerId = ride.bookedBy._id?.toString() || ride.bookedBy.toString();
                            const customerSocketId = activeConnections.get(customerId);
                            
                            if (customerSocketId) {
                                io.to(customerSocketId).emit('driver:location-update', {
                                    rideId,
                                    driverId: userId,
                                    latitude,
                                    longitude,
                                    timestamp: new Date()
                                });
                                
                                console.log(`🚀 BROADCASTING TO CUSTOMER`);
                                console.log(`Ride ID:     ${rideId}`);
                                console.log(`Customer ID: ${customerId}`);
                                console.log(`Socket ID:   ${customerSocketId}`);
                                console.log(`Ride Status: ${ride.rideStatus}`);
                                console.log(`Status:      ✓ Sent successfully`);
                            } else {
                                console.log(`⚠️  CUSTOMER NOT CONNECTED`);
                                console.log(`Ride ID:     ${rideId}`);
                                console.log(`Customer ID: ${customerId}`);
                                console.log(`Status:      Customer offline`);
                            }
                        } else {
                            console.log(`ℹ️  Ride not in trackable status (${ride?.rideStatus || 'NOT FOUND'})`);
                        }
                    } catch (rideError) {
                        console.error('⚠️  Error fetching ride for location broadcast:', rideError.message);
                    }
                } else {
                    // Fallback: Check ongoing rides map if no rideId provided
                    let locationBroadcasted = false;
                    for (const [ongoingRideId, rideInfo] of ongoingRides.entries()) {
                        if (rideInfo.driverId === userId) {
                            const customerSocketId = activeConnections.get(rideInfo.customerId);
                            if (customerSocketId) {
                                io.to(customerSocketId).emit('driver:location-update', {
                                    rideId: ongoingRideId,
                                    driverId: userId,
                                    latitude,
                                    longitude,
                                    timestamp: new Date()
                                });
                                
                                console.log(`🚀 BROADCASTING TO CUSTOMER (fallback)`);
                                console.log(`Ride ID:     ${ongoingRideId}`);
                                console.log(`Customer ID: ${rideInfo.customerId}`);
                                console.log(`Socket ID:   ${customerSocketId}`);
                                console.log(`Status:      ✓ Sent successfully`);
                                locationBroadcasted = true;
                            } else {
                                console.log(`⚠️  CUSTOMER NOT CONNECTED`);
                                console.log(`Ride ID:     ${ongoingRideId}`);
                                console.log(`Customer ID: ${rideInfo.customerId}`);
                                console.log(`Status:      Customer offline`);
                            }
                            break;
                        }
                    }
                    
                    if (!locationBroadcasted) {
                        console.log(`ℹ️  No active ride found - Location saved to database only`);
                    }
                }
                
                console.log('═══════════════════════════════════════════════════════');
            } catch (error) {
                console.error('❌ LOCATION UPDATE ERROR:', error.message);
                socket.emit('error', { message: error.message });
            }
        });

        // Customer creates a new ride
        socket.on('ride:create', async (rideData) => {
            try {
                const { customerLocation, ...rideInfo } = rideData;

                const estimatedDistance = rideData?.estimatedDistance || 0;
                
                // Ensure estimatedDistance is included in the ride info
                rideInfo.estimatedDistance = estimatedDistance;
                
                const result = await createRide(rideInfo, customerLocation);
                const { ride, nearbyDrivers, timeout, searchRadius } = result;

                // Store ride-customer mapping  
                rideCustomerMap.set(ride._id.toString(), rideData.bookedBy);

                // Join ride-specific room
                socket.join(`ride:${ride._id}`);

                // Emit to customer
                socket.emit('ride:created', {
                    success: true,
                    ride,
                    nearbyDrivers: nearbyDrivers.map(d => ({
                        userId: d._id,
                        name: d.name,
                        distance: d.distanceKm,
                        availableDrivers: d.availableDrivers,
                        availableVehicles: d.availableVehicles
                    })),
                    timeout,
                    searchRadius
                });

                // Broadcast new ride to nearby owners only
                const rideDataForBroadcast = {
                    _id: ride._id,
                    from: ride.from,
                    to: ride.to,
                    pickUpDateTime: ride.pickUpDateTime,
                    vehicleType: ride.vehicleType,
                    passangerCount: ride.passangerCount,
                    fare: ride.fare,
                    rideType: ride.rideType,
                    rideStatus: ride.rideStatus,
                    estimatedDistance: ride.estimatedDistance || estimatedDistance,
                    isLater: ride.isLater,
                    bookedBy: ride.bookedBy ? {
                        _id: ride.bookedBy._id,
                        name: ride.bookedBy.name,
                        phoneNumber: ride.bookedBy.phoneNumber
                    } : null
                };

                // Filter nearby owners based on driver availability
                const availableOwners = [];
                for (const owner of nearbyDrivers || []) {
                    try {
                        const availability = await checkUserDriversAvailability(
                            owner._id.toString(),
                            {
                                rideType: ride.rideType,
                                pickUpDateTime: ride.pickUpDateTime
                            }
                        );
                        
                        if (availability.available) {
                            availableOwners.push(owner);
                        } else {
                            console.log(`Owner ${owner._id} not available: ${availability.reason}`);
                        }
                    } catch (availError) {
                        console.error(`Error checking availability for owner ${owner._id}:`, availError.message);
                        // Include owner anyway if there's an error checking availability
                        availableOwners.push(owner);
                    }
                }

                // Notify only available nearby owners about this ride
                if (availableOwners && availableOwners.length > 0) {
                    const offlineDriverTokens = [];
                    
                    availableOwners.forEach(owner => {
                        if (owner.socketId) {
                            // Send via socket if connected
                            io.to(owner.socketId).emit('ride:new', { 
                                ride: rideDataForBroadcast,
                                distance: owner.distanceKm,
                                message: `New ride ${owner.distanceKm.toFixed(1)} km away from you`
                            });
                        } else {
                            // Collect FCM tokens for offline users
                            if (owner.fcmToken && owner.isSendNotification) {
                                offlineDriverTokens.push(owner.fcmToken);
                            }
                        }
                    });
                    
                    // Send notification to offline drivers
                    if (offlineDriverTokens.length > 0) {
                        await generalNotification({
                            userarray: offlineDriverTokens,
                            title: 'New Ride Available',
                            body: `New ${ride.rideType} ride from ${ride.from} to ${ride.to} - Fare: ₹${ride.fare}`
                        });
                        console.log(`Sent notification to ${offlineDriverTokens.length} offline drivers`);
                    }
                    
                    console.log(`Notified ${availableOwners.length} available owners (${nearbyDrivers?.length || 0} total nearby) about ride ${ride._id}`);
                } else {
                    console.log(`No available owners found for ride ${ride._id} (${nearbyDrivers?.length || 0} nearby but busy)`);
                }



                // Notify available nearby drivers
                availableOwners.forEach(driver => {
                    if (driver.socketId) {
                        io.to(driver.socketId).emit('ride:new-request', {
                            ride: {
                                _id: ride._id,
                                to: ride.to,
                                from: ride.from,
                                pickUpDateTime: ride.pickUpDateTime,
                                vehicleType: ride.vehicleType,
                                passangerCount: ride.passangerCount,
                                fare: ride.fare,
                                rideType: ride.rideType,
                                estimatedDistance: ride.estimatedDistance || estimatedDistance,
                                isLater: ride.isLater
                            },
                            timeout
                        });
                    }
                });

                // Set timeout only for QUICKRIDE (no timeout for OUTSTATION)
                if (timeout > 0 && ride.rideType === 'QUICKRIDE') {
                    // Set up timer interval to emit remaining time every 10 seconds
                    const timerInterval = setInterval(async () => {
                        try {
                            const currentRide = await getRideById(ride._id.toString());
                            
                            // Stop timer if ride is no longer pending
                            if (currentRide.rideStatus !== 'PENDING') {
                                clearInterval(timerInterval);
                                rideTimerIntervals.delete(ride._id.toString());
                                return;
                            }
                            
                            if (currentRide.expiresAt) {
                                const { remainingSeconds, isExpired } = calculateRemainingTime(currentRide.expiresAt);
                                
                                if (!isExpired) {
                                    // Emit to ride room (customer)
                                    io.to(`ride:${ride._id}`).emit('ride:timer-update', {
                                        rideId: ride._id,
                                        remainingSeconds,
                                        expiresAt: currentRide.expiresAt
                                    });
                                    
                                    console.log(`Timer update for ride ${ride._id}: ${remainingSeconds}s remaining`);
                                }
                            }
                        } catch (error) {
                            console.error('Timer interval error:', error);
                        }
                    }, 10000); // Emit every 10 seconds
                    
                    rideTimerIntervals.set(ride._id.toString(), timerInterval);

                    const timeoutId = setTimeout(async () => {
                        try {
                            const currentRide = await getRideById(ride._id.toString());
                            
                            if (currentRide.rideStatus === 'PENDING') {
                                // QUICKRIDE: Default if no acceptance (automatic cancellation)
                                await defaultRide(ride._id.toString(), 'No driver found within 5-minute timeout');
                                
                                io.to(`ride:${ride._id}`).emit('ride:timeout', {
                                    rideId: ride._id,
                                    message: 'Ride defaulted - No driver found within 5 minutes',
                                    status: 'DEFAULTED',
                                    rideType: ride.rideType
                                });
                                
                                // Notify all owners
                                io.to('rides:all').emit('ride:updated', {
                                    rideId: ride._id,
                                    rideStatus: 'DEFAULTED',
                                    message: 'Ride defaulted due to timeout'
                                });

                                // Clean up timer interval and timeout
                                if (rideTimerIntervals.has(ride._id.toString())) {
                                    clearInterval(rideTimerIntervals.get(ride._id.toString()));
                                    rideTimerIntervals.delete(ride._id.toString());
                                }
                                rideTimeouts.delete(ride._id.toString());
                                rideCustomerMap.delete(ride._id.toString());
                            }
                        } catch (error) {
                            console.error('Timeout error:', error);
                        }
                    }, timeout);

                    rideTimeouts.set(ride._id.toString(), timeoutId);
                }

                console.log(`Ride ${ride._id} created by customer ${rideData.bookedBy} | Type: ${ride.rideType} | Search Radius: ${searchRadius}km | Timeout: ${timeout/1000}s | Nearby owners: ${nearbyDrivers.length}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Owner raises request for a ride (selects their driver and vehicle)
        socket.on('request:create', async (requestData) => {
            try {
                // Get the ride details to check driver availability
                const ride = await getRideById(requestData.requestedFor);
                
                if (!ride) {
                    return socket.emit('request:create-failed', {
                        success: false,
                        message: 'Ride not found'
                    });
                }

                // Check if the driver is available for this ride
                const availability = await checkDriverAvailability(
                    requestData.driver,
                    {
                        rideType: ride.rideType,
                        pickUpDateTime: ride.pickUpDateTime
                    }
                );

                if (!availability.available) {
                    return socket.emit('request:create-failed', {
                        success: false,
                        message: availability.reason,
                        unavailable: true
                    });
                }

                const request = await createRequest(requestData);

                // Notify customer about new request
                const customerId = rideCustomerMap.get(requestData.requestedFor);
                if (customerId) {
                    const customerSocketId = activeConnections.get(customerId);
                    if (customerSocketId) {
                        io.to(customerSocketId).emit('request:new', {
                            fare : request.fare,
                            request : request,
                            message: 'New request received for your ride'
                        });
                    } else {
                        // Send notification if customer is offline
                        try {
                            const { Customer } = await import('../models/customer.model.js');
                            const customer = await Customer.findById(customerId).select('fcmToken');
                            if (customer && customer.fcmToken) {
                                await generalNotification({
                                    userarray: [customer.fcmToken],
                                    title: 'New Ride Request',
                                    body: 'A driver has requested to take your ride'
                                });
                            }
                        } catch (notifError) {
                            console.error('Error sending notification:', notifError);
                        }
                    }
                }

                // Confirm to driver
                socket.emit('request:created', {
                    success: true,
                    request,
                    message: 'Request submitted successfully'
                });

                console.log(`Request ${request._id} created for ride ${requestData.requestedFor}`);
            } catch (error) {
                // Send error response
                socket.emit('request:create-failed', { 
                    success: false,
                    message: error.message
                });
                console.error(`Request creation failed: ${error.message}`);
            }
        });

        // Customer accepts a request
        socket.on('request:accept', async ({ requestId, rideId }) => {
            try {
                const acceptedRequest = await approveRequest(requestId);

                // Clear timeout and timer interval if exists
                if (rideTimeouts.has(rideId)) {
                    clearTimeout(rideTimeouts.get(rideId));
                    rideTimeouts.delete(rideId);
                }
                if (rideTimerIntervals.has(rideId)) {
                    clearInterval(rideTimerIntervals.get(rideId));
                    rideTimerIntervals.delete(rideId);
                }

                // Get all other requests for this ride
                const allRequests = await getRequestsByRide(rideId);

                // Decline all other pending requests
                for (const req of allRequests) {
                    if (req._id.toString() !== requestId && req.requestStatus === 'PENDING') {
                        await declineRequest(req._id.toString(), 'Another request was accepted');
                        
                        // Notify declined drivers
                        const driverUserId = req.requestRaisedBy._id || req.requestRaisedBy;
                        const driverSocketId = activeConnections.get(driverUserId.toString());
                        if (driverSocketId) {
                            io.to(driverSocketId).emit('request:declined', {
                                requestId: req._id,
                                rideId,
                                reason: 'Customer accepted another request'
                            });
                        } else {
                            // Send notification if offline
                            try {
                                const driver = await User.findById(driverUserId).select('fcmToken isSendNotification');
                                if (driver && driver.fcmToken && driver.isSendNotification) {
                                    await generalNotification({
                                        userarray: [driver.fcmToken],
                                        title: 'Request Declined',
                                        body: 'Customer accepted another request for the ride'
                                    });
                                }
                            } catch (notifError) {
                                console.error('Error sending notification:', notifError);
                            }
                        }
                    }
                }

                // Update ride status
                await updateRideStatus(rideId, 'ACCEPTED' , acceptedRequest.fare , acceptedRequest.requestRaisedBy);

                // Generate OTP for ride start
                const startOtp = generateRideOTP(4);
                const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

                // Save OTP to ride
                await Ride.findByIdAndUpdate(rideId, {
                    startOtp,
                    startOtpExpiresAt: otpExpiresAt,
                    assingTo: acceptedRequest.driver._id || acceptedRequest.driver
                });

                console.log(`Ride ${rideId} OTP generated: ${startOtp} (expires at ${otpExpiresAt})`);

                // Broadcast status update to all owners
                io.to('rides:all').emit('ride:updated', {
                    rideId,
                    rideStatus: 'ACCEPTED',
                    message: 'Ride accepted by customer'
                });

                // Notify accepted driver
                const acceptedDriverId = acceptedRequest.requestRaisedBy._id || acceptedRequest.requestRaisedBy;
                const acceptedDriverSocketId = activeConnections.get(acceptedDriverId.toString());
                if (acceptedDriverSocketId) {
                    io.to(acceptedDriverSocketId).emit('request:accepted', {
                        request: acceptedRequest,
                        message: 'Your request has been accepted!',
                        rideId
                    });
                } else {
                    // Send notification if offline
                    try {
                        const driver = await User.findById(acceptedDriverId).select('fcmToken isSendNotification');
                        if (driver && driver.fcmToken && driver.isSendNotification) {
                            await generalNotification({
                                userarray: [driver.fcmToken],
                                title: 'Request Accepted!',
                                body: 'Your ride request has been accepted by the customer'
                            });
                        }
                    } catch (notifError) {
                        console.error('Error sending notification:', notifError);
                    }
                }
                console.log(`Accepted Request: ${JSON.stringify(acceptedRequest.fare)}`);
                // Notify customer with OTP
                socket.emit('request:accept-success', {
                    success: true,
                    fare : acceptedRequest.fare,
                    startOtp: startOtp,
                    request: acceptedRequest,
                    message: 'Request accepted successfully',
                    otpGenerated: true,
                    startOtpExpiresAt: otpExpiresAt,
                });

                // Broadcast to ride room
                io.to(`ride:${rideId}`).emit('ride:request-accepted', {
                    rideId,
                    requestId,
                    driver: acceptedRequest.driver,
                    vehicle: acceptedRequest.vehicle
                });

                console.log(`Request ${requestId} accepted for ride ${rideId}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Customer declines a request
        socket.on('request:decline', async ({ requestId, rideId, reason }) => {
            try {
                const result = await declineRequest(requestId, reason);
                const declinedRequest = result.request;

                // Notify driver
                const driverUserId = declinedRequest.requestRaisedBy._id || declinedRequest.requestRaisedBy;
                const driverSocketId = activeConnections.get(driverUserId.toString());
                if (driverSocketId) {
                    io.to(driverSocketId).emit('request:declined', {
                        requestId,
                        rideId,
                        reason: reason || 'Customer declined your request'
                    });
                } else {
                    // Send notification if offline
                    try {
                        const driver = await User.findById(driverUserId).select('fcmToken isSendNotification');
                        if (driver && driver.fcmToken && driver.isSendNotification) {
                            await generalNotification({
                                userarray: [driver.fcmToken],
                                title: 'Request Declined',
                                body: reason || 'Customer declined your ride request'
                            });
                        }
                    } catch (notifError) {
                        console.error('Error sending notification:', notifError);
                    }
                }

                // Confirm to customer
                socket.emit('request:decline-success', {
                    success: true,
                    requestId,
                    message: 'Request declined'
                });

                console.log(`Request ${requestId} declined for ride ${rideId}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Customer cancels a request (declines all requests for the ride)
        socket.on('request:cancel', async ({ requestId, rideId, reason }) => {
            try {
                const result = await cancelRequest(requestId, reason);
                const cancelledRequest = result.request;
                const declinedCount = result.declinedOthersCount;

                // Get all declined requests to notify respective drivers
                const allRequests = await getRequestsByRide(rideId);
                for (const req of allRequests) {
                    if (req.requestStatus === 'DECLINED') {
                        const driverUserId = req.requestRaisedBy._id || req.requestRaisedBy;
                        const driverSocketId = activeConnections.get(driverUserId.toString());
                        if (driverSocketId) {
                            io.to(driverSocketId).emit('request:cancelled', {
                                requestId: req._id,
                                rideId,
                                reason: reason || 'User cancelled their request'
                            });
                        } else {
                            // Send notification if offline
                            try {
                                const driver = await User.findById(driverUserId).select('fcmToken isSendNotification');
                                if (driver && driver.fcmToken && driver.isSendNotification) {
                                    await generalNotification({
                                        userarray: [driver.fcmToken],
                                        title: 'Request Cancelled',
                                        body: reason || 'User cancelled their ride request'
                                    });
                                }
                            } catch (notifError) {
                                console.error('Error sending notification:', notifError);
                            }
                        }
                    }
                }

                // Confirm to customer
                socket.emit('request:cancel-success', {
                    success: true,
                    requestId,
                    declinedCount: declinedCount + 1, // +1 for the original request
                    message: `Request cancelled. All ${declinedCount + 1} requests for this ride have been declined.`
                });

                console.log(`Request ${requestId} cancelled for ride ${rideId}. ${declinedCount} other requests also declined.`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Customer updates ride fare
        socket.on('ride:update-fare', async ({ rideId, newFare }) => {
            try {
                const updatedRide = await updateRideFare(rideId, newFare);

                console.log(updatedRide);

                const rideDataForBroadcast = {
                    type : 'FARE_UPDATE',
                    _id: updatedRide._id,
                    from: updatedRide.from,
                    to: updatedRide.to,
                    pickUpDateTime: updatedRide.pickUpDateTime,
                    vehicleType: updatedRide.vehicleType,
                    passangerCount: updatedRide.passangerCount,
                    fare: updatedRide.fare,
                    rideType: updatedRide.rideType,
                    rideStatus: updatedRide.rideStatus,
                    estimatedDistance: updatedRide.estimatedDistance,
                    isLater: updatedRide.isLater,
                    bookedBy: updatedRide.bookedBy ? {
                        _id: updatedRide.bookedBy._id,
                        name: updatedRide.bookedBy.name,
                        phoneNumber: updatedRide.bookedBy.phoneNumber
                    } : null
                };

                console.log(rideDataForBroadcast);

                // Notify all users watching this ride
                io.to(`ride:${rideId}`).emit('ride:update', rideDataForBroadcast);

                // Also broadcast to all owners subscribed to rides
                io.to('rides:all').emit('ride:update', rideDataForBroadcast);

                // Send notification to offline users
                try {
                    const offlineUsers = await User.find({ 
                        isSendNotification: true,
                        fcmToken: { $exists: true, $ne: null }
                    }).select('fcmToken _id');
                    
                    const offlineTokens = offlineUsers
                        .filter(user => !activeConnections.has(user._id.toString()))
                        .map(user => user.fcmToken);
                    
                    if (offlineTokens.length > 0) {
                        await generalNotification({
                            userarray: offlineTokens,
                            title: 'Ride Fare Updated',
                            body: `Ride from ${updatedRide.from} to ${updatedRide.to} - New Fare: ₹${updatedRide.fare}`
                        });
                        console.log(`Sent fare update notification to ${offlineTokens.length} offline users`);
                    }
                } catch (notifError) {
                    console.error('Error sending notification:', notifError);
                }

                socket.emit('ride:update-fare-success', {
                    success: true,
                    ride: updatedRide
                });

                console.log(`Ride ${rideId} fare updated to ${newFare}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Customer cancels ride
        socket.on('ride:cancel', async ({ rideId, customerId }) => {
            try {
                const result = await cancelRide(rideId);
                const cancelledRide = result.ride;

                // Clear timeout and timer interval if exists
                if (rideTimeouts.has(rideId)) {
                    clearTimeout(rideTimeouts.get(rideId));
                    rideTimeouts.delete(rideId);
                }
                if (rideTimerIntervals.has(rideId)) {
                    clearInterval(rideTimerIntervals.get(rideId));
                    rideTimerIntervals.delete(rideId);
                }
                // Stop location tracking if ongoing
                const wasTracking = ongoingRides.has(rideId);
                if (wasTracking) {
                    const rideInfo = ongoingRides.get(rideId);
                    console.log('\n🟡═══════════════════════════════════════════════════════════════');
                    console.log('⚠️  RIDE CANCELLED - LOCATION TRACKING STOPPED');
                    console.log(`Ride ID:     ${rideId}`);
                    console.log(`Driver ID:   ${rideInfo.driverId}`);
                    console.log(`Customer ID: ${rideInfo.customerId}`);
                    console.log(`Status:      CANCELLED`);
                    console.log(`Tracking:    ✗ STOPPED - Location tracking terminated`);
                    console.log('═══════════════════════════════════════════════════════════════\n');
                }
                ongoingRides.delete(rideId);

                // Get all requests for this ride and notify drivers
                // Note: Requests are already declined by the cancelRide service
                const requests = await getRequestsByRide(rideId);
                for (const req of requests) {
                    if (req.requestStatus === 'DECLINED') {
                        const driverUserId = req.requestRaisedBy._id || req.requestRaisedBy;
                        const driverSocketId = activeConnections.get(driverUserId.toString());
                        if (driverSocketId) {
                            io.to(driverSocketId).emit('ride:cancelled-by-customer', {
                                rideId,
                                requestId: req._id,
                                message: 'Customer has cancelled the ride'
                            });
                        } else {
                            // Send notification if offline
                            try {
                                const driver = await User.findById(driverUserId).select('fcmToken isSendNotification');
                                if (driver && driver.fcmToken && driver.isSendNotification) {
                                    await generalNotification({
                                        userarray: [driver.fcmToken],
                                        title: 'Ride Cancelled',
                                        body: 'Customer has cancelled the ride'
                                    });
                                }
                            } catch (notifError) {
                                console.error('Error sending notification:', notifError);
                            }
                        }
                    }
                }

                // Broadcast to ride room
                io.to(`ride:${rideId}`).emit('ride:cancelled', {
                    rideId,
                    message: 'Ride has been cancelled'
                });

                // Broadcast status update to all owners
                io.to('rides:all').emit('ride:updated', {
                    rideId,
                    rideStatus: 'CANCELLED',
                    message: 'Ride cancelled by customer'
                });

                // Send notification to offline users
                try {
                    const offlineUsers = await User.find({ 
                        isSendNotification: true,
                        fcmToken: { $exists: true, $ne: null }
                    }).select('fcmToken _id');
                    
                    const offlineTokens = offlineUsers
                        .filter(user => !activeConnections.has(user._id.toString()))
                        .map(user => user.fcmToken);
                    
                    if (offlineTokens.length > 0) {
                        await generalNotification({
                            userarray: offlineTokens,
                            title: 'Ride Cancelled',
                            body: `Ride from ${cancelledRide.from} to ${cancelledRide.to} has been cancelled`
                        });
                    }
                } catch (notifError) {
                    console.error('Error sending notification:', notifError);
                }

                socket.emit('ride:cancel-success', {
                    success: true,
                    ride: cancelledRide
                });

                // Clean up
                rideCustomerMap.delete(rideId);

                console.log(`Ride ${rideId} cancelled by customer ${customerId}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Driver starts ride with OTP verification
        socket.on('ride:start', async ({ rideId, driverId, otp }) => {
            try {
                // Fetch ride with OTP fields
                const ride = await Ride.findById(rideId).select('+startOtp +startOtpExpiresAt').populate('bookedBy');
                
                if (!ride) {
                    return socket.emit('error', { message: 'Ride not found' });
                }

                if (ride.rideStatus !== 'ACCEPTED') {
                    return socket.emit('error', { message: 'Ride must be in ACCEPTED status to start' });
                }

                // Verify OTP
                if (!ride.startOtp) {
                    return socket.emit('error', { message: 'No OTP generated for this ride' });
                }

                if (!otp) {
                    return socket.emit('error', { message: 'OTP is required to start the ride' });
                }

                if (ride.startOtp !== otp) {
                    return socket.emit('error', { message: 'Invalid OTP' });
                }

                if (new Date() > ride.startOtpExpiresAt) {
                    return socket.emit('error', { message: 'OTP has expired' });
                }

                // OTP verified, start the ride
                const updatedRide = await updateRideStatus(rideId, 'ONGOING');

                // Clear OTP after successful verification
                await Ride.findByIdAndUpdate(rideId, {
                    $unset: { startOtp: 1, startOtpExpiresAt: 1 }
                });

                // Store ongoing ride info for location tracking
                const customerId = ride.bookedBy._id.toString();
                ongoingRides.set(rideId, {
                    driverId: driverId,
                    customerId: customerId
                });

                console.log('\n🟢═══════════════════════════════════════════════════════');
                console.log('🚀 RIDE STARTED - LOCATION TRACKING ACTIVATED');
                console.log(`Ride ID:     ${rideId}`);
                console.log(`Driver ID:   ${driverId}`);
                console.log(`Customer ID: ${customerId}`);
                console.log(`Status:      ONGOING`);
                console.log(`Tracking:    ✓ ACTIVE - Driver location will be broadcasted every 5 seconds`);
                console.log('═══════════════════════════════════════════════════════\n');

                // Notify customer
                const customerSocketId = activeConnections.get(customerId);
                if (customerSocketId) {
                    io.to(customerSocketId).emit('ride:started', {
                        rideId,
                        status: 'ONGOING',
                        message: 'Driver has started the ride',
                        driverId
                    });
                }

                // Broadcast to ride room
                io.to(`ride:${rideId}`).emit('ride:started', {
                    rideId,
                    status: 'ONGOING',
                    message: 'Driver has started the ride'
                });

                // Broadcast status update to all owners
                io.to('rides:all').emit('ride:updated', {
                    rideId,
                    rideStatus: 'ONGOING',
                    message: 'Ride started'
                });

                // Send notification to offline users
                try {
                    const offlineUsers = await User.find({ 
                        isSendNotification: true,
                        fcmToken: { $exists: true, $ne: null }
                    }).select('fcmToken _id');
                    
                    const offlineTokens = offlineUsers
                        .filter(user => !activeConnections.has(user._id.toString()))
                        .map(user => user.fcmToken);
                    
                    if (offlineTokens.length > 0) {
                        await generalNotification({
                            userarray: offlineTokens,
                            title: 'Ride Started',
                            body: `Ride from ${updatedRide.from} to ${updatedRide.to} has been started`
                        });
                    }
                } catch (notifError) {
                    console.error('Error sending notification:', notifError);
                }

                socket.emit('ride:start-success', {
                    success: true,
                    ride: updatedRide,
                    message: 'Ride started successfully. Location sharing is now active.'
                });

                console.log(`Ride ${rideId} started by driver ${driverId} with OTP verification`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Driver completes ride
        socket.on('ride:complete', async ({ rideId, driverId }) => {
            try {
                const completedRide = await updateRideStatus(rideId, 'COMPLETED');

                // Notify customer
                io.to(`ride:${rideId}`).emit('ride:completed', {
                    rideId,
                    status: 'COMPLETED',
                    message: 'Ride has been completed'
                });

                // Broadcast status update to all owners
                io.to('rides:all').emit('ride:updated', {
                    rideId,
                    rideStatus: 'COMPLETED',
                    message: 'Ride completed'
                });

                // Send notification to offline users
                try {
                    const offlineUsers = await User.find({ 
                        isSendNotification: true,
                        fcmToken: { $exists: true, $ne: null }
                    }).select('fcmToken _id');
                    
                    const offlineTokens = offlineUsers
                        .filter(user => !activeConnections.has(user._id.toString()))
                        .map(user => user.fcmToken);
                    
                    if (offlineTokens.length > 0) {
                        await generalNotification({
                            userarray: offlineTokens,
                            title: 'Ride Completed',
                            body: `Ride from ${completedRide.from} to ${completedRide.to} has been completed`
                        });
                    }
                } catch (notifError) {
                    console.error('Error sending notification:', notifError);
                }

                socket.emit('ride:complete-success', {
                    success: true,
                    ride: completedRide
                });

                // Clean up
                rideCustomerMap.delete(rideId);
                ongoingRides.delete(rideId); // Stop location tracking

                console.log('\n🔴═══════════════════════════════════════════════════════');
                console.log('🏁 RIDE COMPLETED - LOCATION TRACKING STOPPED');
                console.log(`Ride ID:     ${rideId}`);
                console.log(`Driver ID:   ${driverId}`);
                console.log(`Status:      COMPLETED`);
                console.log(`Tracking:    ✗ INACTIVE - No more location updates will be sent`);
                console.log('═══════════════════════════════════════════════════════\n');

                console.log(`Ride ${rideId} completed by driver ${driverId}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Customer requests to view OTP (driver shares verbally)
        socket.on('ride:request-otp', async ({ rideId, customerId }) => {
            try {
                // Fetch ride with OTP
                const ride = await Ride.findById(rideId).select('+startOtp +startOtpExpiresAt');
                
                if (!ride) {
                    return socket.emit('error', { message: 'Ride not found' });
                }

                if (!ride.startOtp) {
                    return socket.emit('error', { message: 'No OTP has been generated for this ride yet' });
                }

                if (new Date() > ride.startOtpExpiresAt) {
                    return socket.emit('error', { message: 'OTP has expired' });
                }

                // Notify customer that they should ask driver for OTP
                socket.emit('ride:otp-info', {
                    success: true,
                    rideId,
                    message: 'Please ask the driver for the 4-digit OTP to start the ride',
                    hasOtp: true,
                    expiresAt: ride.startOtpExpiresAt
                });

                console.log(`Customer ${customerId} requested OTP info for ride ${rideId}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Driver requests to view their OTP for sharing with customer
        socket.on('driver:get-otp', async ({ rideId, driverId }) => {
            try {
                // Fetch ride with OTP
                const ride = await Ride.findById(rideId).select('+startOtp +startOtpExpiresAt assingTo');
                
                if (!ride) {
                    return socket.emit('error', { message: 'Ride not found' });
                }

                // Verify driver is assigned to this ride
                if (ride.assingTo?.toString() !== driverId) {
                    return socket.emit('error', { message: 'You are not assigned to this ride' });
                }

                if (!ride.startOtp) {
                    return socket.emit('error', { message: 'No OTP has been generated for this ride yet' });
                }

                if (new Date() > ride.startOtpExpiresAt) {
                    return socket.emit('error', { message: 'OTP has expired' });
                }

                // Send OTP to driver only
                socket.emit('driver:otp-received', {
                    success: true,
                    rideId,
                    otp: ride.startOtp,
                    expiresAt: ride.startOtpExpiresAt,
                    message: 'Share this OTP with the customer to start the ride'
                });

                console.log(`Driver ${driverId} retrieved OTP for ride ${rideId}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Get real-time ride updates
        socket.on('ride:subscribe', ({ rideId }) => {
            socket.join(`ride:${rideId}`);
            socket.emit('ride:subscribed', { rideId, message: 'Subscribed to ride updates' });
        });

        socket.on('ride:unsubscribe', ({ rideId }) => {
            socket.leave(`ride:${rideId}`);
            socket.emit('ride:unsubscribed', { rideId, message: 'Unsubscribed from ride updates' });
        });

        // Get remaining time for a ride (useful for reconnection or manual check)
        socket.on('ride:get-remaining-time', async ({ rideId }) => {
            try {
                const ride = await getRideById(rideId);
                
                if (!ride) {
                    return socket.emit('error', { message: 'Ride not found' });
                }
                
                if (ride.rideType !== 'QUICKRIDE') {
                    return socket.emit('ride:no-timer', {
                        rideId,
                        message: 'This ride type does not have a timer'
                    });
                }
                
                if (ride.rideStatus !== 'PENDING') {
                    return socket.emit('ride:no-timer', {
                        rideId,
                        rideStatus: ride.rideStatus,
                        message: 'Timer is only active for pending rides'
                    });
                }
                
                if (!ride.expiresAt) {
                    return socket.emit('error', { message: 'No expiration time set for this ride' });
                }
                
                const { remainingSeconds, isExpired } = calculateRemainingTime(ride.expiresAt);
                
                if (isExpired) {
                    socket.emit('ride:timer-expired', {
                        rideId,
                        message: 'Ride timer has expired'
                    });
                } else {
                    socket.emit('ride:remaining-time', {
                        rideId,
                        remainingSeconds,
                        expiresAt: ride.expiresAt,
                        rideStatus: ride.rideStatus
                    });
                }
                
                console.log(`Sent remaining time for ride ${rideId}: ${remainingSeconds}s`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            try {
                if (socket.userId) {
                    await updateUserOnlineStatus(socket.userId, false, null);
                    activeConnections.delete(socket.userId);
                    console.log(`User ${socket.userId} disconnected`);
                } else if (socket.customerId) {
                    // DO NOT auto-default rides - keep timer running even when customer disconnects
                    // Timer will continue and user can reconnect to see remaining time
                    try {
                        const pendingRides = await getPendingRidesByCustomer(socket.customerId);
                        
                        for (const ride of pendingRides) {
                            if (ride.rideType === 'QUICKRIDE' && ride.rideStatus === 'PENDING' && ride.expiresAt) {
                                const { remainingSeconds } = calculateRemainingTime(ride.expiresAt);
                                console.log(`Customer ${socket.customerId} disconnected with pending QUICKRIDE ${ride._id} - Timer continues: ${remainingSeconds}s remaining`);
                            }
                        }
                    } catch (rideError) {
                        console.error('Error logging pending rides on disconnect:', rideError);
                    }
                    
                    activeConnections.delete(socket.customerId);
                    console.log(`Customer ${socket.customerId} disconnected`);
                }
            } catch (error) {
                console.error('Disconnect error:', error);
            }
        });
    });

    return io;
};

/**
 * Get active connections map
 * @returns {Map} Active connections
 */
export const getActiveConnections = () => activeConnections;

/**
 * Get ride timeouts map
 * @returns {Map} Ride timeouts
 */
export const getRideTimeouts = () => rideTimeouts;

export default { initializeSocket, getActiveConnections, getRideTimeouts };
