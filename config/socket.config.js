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
    defaultRide
} from '../service/ride.service.js';
import { 
    createRequest, 
    updateRequestStatus,
    getRequestsByRide,
    approveRequest,
    declineRequest
} from '../service/request.service.js';

// Store active socket connections: userId -> socketId
const activeConnections = new Map();
// Store ride timeouts: rideId -> timeoutId
const rideTimeouts = new Map();
// Store customer sockets by ride: rideId -> customerId
const rideCustomerMap = new Map();

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
        socket.on('user:update-location', async ({ userId, latitude, longitude }) => {
            try {
                await updateUserLocation(userId, latitude, longitude);
                
                socket.emit('user:location-updated', { 
                    success: true,
                    latitude,
                    longitude
                });
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Customer creates a new ride
        socket.on('ride:create', async (rideData) => {
            try {
                const { customerLocation, ...rideInfo } = rideData;
                
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
                    estimatedDistance: ride.estimatedDistance
                };

                // Notify only nearby owners about this ride
                if (nearbyDrivers && nearbyDrivers.length > 0) {
                    nearbyDrivers.forEach(owner => {
                        if (owner.socketId) {
                            io.to(owner.socketId).emit('ride:new', { 
                                ride: rideDataForBroadcast,
                                distance: owner.distanceKm,
                                message: `New ride ${owner.distanceKm.toFixed(1)} km away from you`
                            });
                        }
                    });
                    console.log(`Notified ${nearbyDrivers.length} nearby owners about ride ${ride._id}`);
                } else {
                    console.log(`No nearby owners found for ride ${ride._id}`);
                }

                // Notify nearby drivers
                nearbyDrivers.forEach(driver => {
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
                                distanceKm: driver.distanceKm
                            },
                            timeout
                        });
                    }
                });

                // Set timeout based on ride type
                if (timeout > 0) {
                    const timeoutId = setTimeout(async () => {
                        try {
                            const currentRide = await getRideById(ride._id.toString());
                            
                            if (currentRide.rideStatus === 'PENDING') {
                                // QUICKRIDE: Default if no acceptance (automatic cancellation)
                                // OUTSTATION: Cancel if no acceptance (advance booking)
                                if (ride.rideType === 'QUICKRIDE') {
                                    await defaultRide(ride._id.toString(), 'No driver found within 3-minute timeout');
                                    
                                    io.to(`ride:${ride._id}`).emit('ride:timeout', {
                                        rideId: ride._id,
                                        message: 'Ride defaulted - No driver found within 3 minutes',
                                        status: 'DEFAULTED',
                                        rideType: ride.rideType
                                    });
                                    
                                    // Notify all owners
                                    io.to('rides:all').emit('ride:updated', {
                                        rideId: ride._id,
                                        rideStatus: 'DEFAULTED',
                                        message: 'Ride defaulted due to timeout'
                                    });
                                } else {
                                    await updateRideStatus(ride._id.toString(), 'CANCELLED');
                                    
                                    io.to(`ride:${ride._id}`).emit('ride:timeout', {
                                        rideId: ride._id,
                                        message: 'No driver found within 1-hour timeout',
                                        status: 'CANCELLED',
                                        rideType: ride.rideType
                                    });
                                    
                                    // Notify all owners
                                    io.to('rides:all').emit('ride:updated', {
                                        rideId: ride._id,
                                        rideStatus: 'CANCELLED',
                                        message: 'Ride cancelled due to timeout'
                                    });
                                }

                                // Clean up
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
                const request = await createRequest(requestData);

                // Notify customer about new request
                const customerId = rideCustomerMap.get(requestData.requestedFor);
                if (customerId) {
                    const customerSocketId = activeConnections.get(customerId);
                    if (customerSocketId) {
                        io.to(customerSocketId).emit('request:new', {
                            request,
                            message: 'New request received for your ride'
                        });
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
                socket.emit('error', { message: error.message });
            }
        });

        // Customer accepts a request
        socket.on('request:accept', async ({ requestId, rideId }) => {
            try {
                const acceptedRequest = await approveRequest(requestId);

                // Clear timeout if exists
                if (rideTimeouts.has(rideId)) {
                    clearTimeout(rideTimeouts.get(rideId));
                    rideTimeouts.delete(rideId);
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
                        }
                    }
                }

                // Update ride status
                await updateRideStatus(rideId, 'ACCEPTED');

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
                }

                // Notify customer
                socket.emit('request:accept-success', {
                    success: true,
                    request: acceptedRequest,
                    message: 'Request accepted successfully'
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
                const declinedRequest = await declineRequest(requestId, reason);

                // Notify driver
                const driverUserId = declinedRequest.requestRaisedBy._id || declinedRequest.requestRaisedBy;
                const driverSocketId = activeConnections.get(driverUserId.toString());
                if (driverSocketId) {
                    io.to(driverSocketId).emit('request:declined', {
                        requestId,
                        rideId,
                        reason: reason || 'Customer declined your request'
                    });
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

        // Customer updates ride fare
        socket.on('ride:update-fare', async ({ rideId, newFare }) => {
            try {
                const updatedRide = await updateRideFare(rideId, newFare);

                // Notify all users watching this ride
                io.to(`ride:${rideId}`).emit('ride:fare-updated', {
                    rideId,
                    newFare,
                    message: 'Ride fare has been updated'
                });

                // Also broadcast to all owners subscribed to rides
                io.to('rides:all').emit('ride:fare-updated', {
                    rideId,
                    newFare,
                    message: 'Ride fare has been updated'
                });

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
                const cancelledRide = await cancelRide(rideId);

                // Clear timeout if exists
                if (rideTimeouts.has(rideId)) {
                    clearTimeout(rideTimeouts.get(rideId));
                    rideTimeouts.delete(rideId);
                }

                // Get all requests for this ride and notify drivers
                const requests = await getRequestsByRide(rideId);
                for (const req of requests) {
                    if (req.requestStatus === 'PENDING' || req.requestStatus === 'APPROVED') {
                        const driverUserId = req.requestRaisedBy._id || req.requestRaisedBy;
                        const driverSocketId = activeConnections.get(driverUserId.toString());
                        if (driverSocketId) {
                            io.to(driverSocketId).emit('ride:cancelled-by-customer', {
                                rideId,
                                requestId: req._id,
                                message: 'Customer has cancelled the ride'
                            });
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

        // Driver starts ride
        socket.on('ride:start', async ({ rideId, driverId }) => {
            try {
                const updatedRide = await updateRideStatus(rideId, 'ONGOING');

                // Notify customer
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

                socket.emit('ride:start-success', {
                    success: true,
                    ride: updatedRide
                });

                console.log(`Ride ${rideId} started by driver ${driverId}`);
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

                socket.emit('ride:complete-success', {
                    success: true,
                    ride: completedRide
                });

                // Clean up
                rideCustomerMap.delete(rideId);

                console.log(`Ride ${rideId} completed by driver ${driverId}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Get real-time ride updates
        socket.on('ride:subscribe', ({ rideId }) => {
            socket.join(`ride:${rideId}`);
            socket.emit('ride:subscribed', { rideId, message: 'Subscribed to ride updates' });
        });

        // Unsubscribe from ride updates
        socket.on('ride:unsubscribe', ({ rideId }) => {
            socket.leave(`ride:${rideId}`);
            socket.emit('ride:unsubscribed', { rideId, message: 'Unsubscribed from ride updates' });
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            try {
                if (socket.userId) {
                    await updateUserOnlineStatus(socket.userId, false, null);
                    activeConnections.delete(socket.userId);
                    console.log(`User ${socket.userId} disconnected`);
                } else if (socket.customerId) {
                    // Check for pending QUICKRIDE rides and auto-default them
                    try {
                        const pendingRides = await getPendingRidesByCustomer(socket.customerId);
                        
                        for (const ride of pendingRides) {
                            // Only auto-default QUICKRIDE in PENDING status
                            if (ride.rideType === 'QUICKRIDE' && ride.rideStatus === 'PENDING') {
                                // Clear timeout if exists
                                if (rideTimeouts.has(ride._id.toString())) {
                                    clearTimeout(rideTimeouts.get(ride._id.toString()));
                                    rideTimeouts.delete(ride._id.toString());
                                }
                                
                                // Default the ride
                                const defaultedRide = await defaultRide(ride._id.toString(), 'Customer disconnected before acceptance');
                                
                                // Notify all owners
                                io.to('rides:all').emit('ride:updated', {
                                    rideId: ride._id,
                                    rideStatus: 'DEFAULTED',
                                    message: 'Ride defaulted - Customer disconnected'
                                });
                                
                                // Broadcast to ride room
                                io.to(`ride:${ride._id}`).emit('ride:defaulted', {
                                    rideId: ride._id,
                                    status: 'DEFAULTED',
                                    reason: 'Customer disconnected',
                                    message: 'Ride has been automatically defaulted'
                                });
                                
                                // Clean up
                                rideCustomerMap.delete(ride._id.toString());
                                
                                console.log(`QUICKRIDE ${ride._id} auto-defaulted - customer ${socket.customerId} disconnected`);
                            }
                        }
                    } catch (rideError) {
                        console.error('Error handling pending rides on disconnect:', rideError);
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
