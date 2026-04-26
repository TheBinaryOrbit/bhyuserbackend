import { Ride } from "../models/rides.js";
import { User } from "../models/user.model.js";
import { Driver } from "../models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import { Request } from "../models/requests.model.js";
import { calculateDistanceFromAddresses } from "../utils/googleMaps.js";

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Number} lat1 - Latitude 1
 * @param {Number} lon1 - Longitude 1
 * @param {Number} lat2 - Latitude 2
 * @param {Number} lon2 - Longitude 2
 * @returns {Number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Determine ride type based on distance
 * @param {Number} distance - Distance in kilometers
 * @returns {String} Ride type
 */
export const determineRideType = (distance) => {
    const outstationThreshold = process.env.OUTSTATION_DISTANCE_KM || 150;
    return distance >= outstationThreshold ? 'OUTSTATION' : 'QUICKRIDE';
};

/**
 * Find nearby online users/drivers
 * @param {Number} latitude - Customer latitude
 * @param {Number} longitude - Customer longitude
 * @param {Number} radiusKm - Search radius in kilometers
 * @param {String} vehicleType - Optional vehicle type filter
 * @returns {Promise<Array>} List of nearby online users
 */
export const findNearbyOnlineUsers = async (latitude, longitude, radiusKm = 10, vehicleType = null) => {
    try {
        const users = await User.find({
            'lastLocation.latitude': { $ne: null },
            'lastLocation.longitude': { $ne: null }
        })
            .populate('availableDrivers')
            .populate('availableVehicles')
            .select('name phoneNumber location lastLocation isOnline availableDrivers availableVehicles socketId fcmToken isSendNotification');

        const usersWithDistance = [];
        const usersWithinRadius = [];

        for (const user of users) {
            const hasLastLocation = user.lastLocation?.latitude != null && user.lastLocation?.longitude != null;

            if (!hasLastLocation) {
                continue;
            }

            const userLat = Number(user.lastLocation.latitude);
            const userLon = Number(user.lastLocation.longitude);

            if (Number.isNaN(userLat) || Number.isNaN(userLon)) {
                continue;
            }

            const distance = calculateDistance(
                Number(latitude),
                Number(longitude),
                userLat,
                userLon
            );

            const userWithDistance = {
                ...user.toObject(),
                distanceKm: parseFloat(distance.toFixed(2))
            };

            usersWithDistance.push(userWithDistance);

            if (distance <= Number(radiusKm || 10)) {
                usersWithinRadius.push(userWithDistance);
            }
        }

        const maxUsers = parseInt(process.env.MAX_DRIVERS_TO_NOTIFY || 20);

        const sortedWithinRadius = usersWithinRadius
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, maxUsers);

        if (sortedWithinRadius.length > 0) {
            return sortedWithinRadius;
        }

        console.log(`No users found in ${radiusKm}km radius. Falling back to all users by lastLocation distance.`);

        return usersWithDistance
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, maxUsers);
    } catch (error) {
        throw new Error(`Error finding nearby users: ${error.message}`);
    }
};

/**
 * Create a new ride with automatic ride type determination
 * @param {Object} rideData - The ride data
 * @param {Object} customerLocation - Customer location {latitude, longitude}
 * @returns {Promise<Object>} The created ride with nearby drivers
 */
export const createRide = async (rideData, customerLocation = null) => {
    try {
        // Calculate distance from Google Maps API if from and to addresses are provided
        if (rideData.from && rideData.to) {
            try {
                const distanceInfo = await calculateDistanceFromAddresses(rideData.from, rideData.to);
                rideData.estimatedDistance = distanceInfo.distanceKm;
                rideData.estimatedDuration = distanceInfo.durationSeconds;
                console.log(`Distance calculated: ${distanceInfo.distanceKm} km (${distanceInfo.durationText})`);
            } catch (distanceError) {
                console.error('Error calculating distance:', distanceError.message);
                // Continue with ride creation even if distance calculation fails
                // Use default value if not provided
                rideData.estimatedDistance = rideData.estimatedDistance || 0;
                rideData.estimatedDuration = rideData.estimatedDuration || 0;
            }
        }

        // Auto-determine ride type based on calculated distance
        if (rideData.estimatedDistance) {
            rideData.rideType = determineRideType(rideData.estimatedDistance);
        }

        console.log('Creating ride with data:', rideData);

        const ride = new Ride(rideData);
        await ride.save();
        
        const populatedRide = await ride.populate('bookedBy');

        // Determine search parameters based on ride type
        let radiusKm = 10; // Default for QUICKRIDE
        let timeout = 300000; // 5 minutes for QUICKRIDE (changed from 3 minutes)
        
        if (rideData.rideType === 'QUICKRIDE') {
            radiusKm = parseFloat(process.env.QUICKRIDE_SEARCH_RADIUS_KM || 10);
            timeout = parseInt(process.env.QUICKRIDE_TIMEOUT_MS || 300000); // 5 minutes default
            
            // Set expiresAt timestamp for quickrides
            const expiresAt = new Date(Date.now() + timeout);
            await Ride.findByIdAndUpdate(ride._id, { expiresAt });
        } else if (rideData.rideType === 'OUTSTATION') {
            radiusKm = parseFloat(process.env.OUTSTATION_SEARCH_RADIUS_KM || 100);
            timeout = 0; // No timeout for OUTSTATION
        }

        // Find nearby online drivers based on ride type
        let nearbyDrivers = [];
        if (customerLocation) {
            nearbyDrivers = await findNearbyOnlineUsers(
                customerLocation.latitude,
                customerLocation.longitude,
                radiusKm,
                rideData.vehicleType
            );
        }

        return {
            ride: populatedRide,
            nearbyDrivers,
            timeout,
            searchRadius: radiusKm
        };
    } catch (error) {
        throw new Error(`Error creating ride: ${error.message}`);
    }
};

/**
 * Get ride by ID
 * @param {String} rideId - The ride ID
 * @returns {Promise<Object>} The ride details with vehicle information
 */
export const getRideById = async (rideId) => {
    try {
        // select startOtp and startOtpExpiresAt for verification if needed
        const ride = await Ride.findById(rideId).select('+startOtp +startOtpExpiresAt').populate('bookedBy').populate('assingTo');
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        // Get vehicle information from the accepted request
        const acceptedRequest = await Request.findOne({ 
            requestedFor: rideId, 
            requestStatus: 'APPROVED' 
        }).populate('vehicle').populate('driver');
        
        // Add vehicle and driver info to ride object if request exists
        const rideObject = ride.toObject();
        if (acceptedRequest) {
            rideObject.vehicle = acceptedRequest.vehicle;
            rideObject.driverDetails = acceptedRequest.driver;
        }
        
        return rideObject;
    } catch (error) {
        throw new Error(`Error fetching ride: ${error.message}`);
    }
};

/**
 * Find pending rides by customer
 * @param {String} customerId - The customer ID
 * @returns {Promise<Array>} List of pending rides
 */
export const getPendingRidesByCustomer = async (customerId) => {
    try {
        const rides = await Ride.find({
            bookedBy: customerId,
            rideStatus: { $in: ['PENDING', 'ACCEPTED'] }
        }).sort({ pickUpDateTime: -1 });
        
        return rides;
    } catch (error) {
        throw new Error(`Error fetching pending rides: ${error.message}`);
    }
};

/**
 * Default a ride (automatic cancellation)
 * @param {String} rideId - The ride ID
 * @param {String} reason - Reason for defaulting
 * @returns {Promise<Object>} The updated ride
 */
export const defaultRide = async (rideId, reason = 'Customer disconnected') => {
    try {
        const ride = await Ride.findByIdAndUpdate(
            rideId,
            { 
                rideStatus: 'DEFAULTED',
                defaultReason: reason
            },
            { new: true }
        ).populate('bookedBy');
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        return ride;
    } catch (error) {
        throw new Error(`Error defaulting ride: ${error.message}`);
    }
};

/**
 * Get all rides with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of rides
 */
export const getAllRides = async (filters = {}) => {
    try {
        const query = {};
        
        if (filters.rideStatus) {
            query.rideStatus = filters.rideStatus;
        }
        
        if (filters.rideType) {
            query.rideType = filters.rideType;
        }
        
        if (filters.vehicleType) {
            query.vehicleType = filters.vehicleType;
        }
        
        if (filters.bookedBy) {
            query.bookedBy = filters.bookedBy;
        }
        
        if (filters.assingTo) {
            query.assingTo = filters.assingTo;
        }
        
        const rides = await Ride.find(query)
            .populate('bookedBy')
            .populate('assingTo')
            .sort({ pickUpDateTime: -1 });
        
        return rides;
    } catch (error) {
        throw new Error(`Error fetching rides: ${error.message}`);
    }
};

/**
 * Get rides booked by a specific customer
 * @param {String} customerId - The customer ID
 * @returns {Promise<Array>} List of rides
 */
export const getRidesByCustomer = async (customerId) => {
    try {
        const rides = await Ride.find({ bookedBy: customerId })
            .populate('bookedBy')
            .populate('assingTo')
            .sort({ pickUpDateTime: -1 });

            console.log(rides);
        
        return rides;
    } catch (error) {
        throw new Error(`Error fetching customer rides: ${error.message}`);
    }
};

/**
 * Get rides assigned to a specific driver
 * @param {String} driverId - The driver ID
 * @returns {Promise<Array>} List of rides
 */
export const getRidesByDriver = async (driverId) => {
    try {
        const rides = await Ride.find({ assingTo: driverId })
            .populate('bookedBy')
            .populate('assingTo')
            .sort({ pickUpDateTime: -1 });
        
        return rides;
    } catch (error) {
        throw new Error(`Error fetching driver rides: ${error.message}`);
    }
};

/**
 * Get rides assigned to user's first driver
 * @param {String} userId - The user ID
 * @returns {Promise<Array>} List of rides assigned to user's first driver
 */
export const getRidesByUser = async (userId) => {
    try {
        // Find the first driver for this user
        const driver = await Driver.findOne({ userId: userId });
        
        if (!driver) {
            throw new Error('No driver found for this user');
        }

        // Get all rides assigned to this driver
        const rides = await Ride.find({ assingTo: driver._id })
            .populate('bookedBy')
            .populate('assingTo')
            .sort({ pickUpDateTime: -1 });
        
        return rides;
    } catch (error) {
        throw new Error(`Error fetching user rides: ${error.message}`);
    }
};

/**
 * Update ride status
 * @param {String} rideId - The ride ID
 * @param {String} status - The new status
 * @returns {Promise<Object>} Updated ride
 */
export const updateRideStatus = async (rideId, status , updatedFare , userId) => {
    try {
        const validStatuses = ['PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED'];

        console.log(`Updating ride status: rideId=${rideId}, status=${status}, updatedFare=${updatedFare}, userId=${userId}`);
        
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid ride status');
        }
        
        const ride = await Ride.findByIdAndUpdate(
            rideId,
            { rideStatus: status, fare: updatedFare , assingTo: userId },
            { new: true, runValidators: true }
        )
            .populate('bookedBy')
            .populate('assingTo');
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        return ride;
    } catch (error) {
        throw new Error(`Error updating ride status: ${error.message}`);
    }
};

/**
 * Assign driver to a ride
 * @param {String} rideId - The ride ID
 * @param {String} driverId - The driver ID
 * @returns {Promise<Object>} Updated ride
 */
export const assignDriverToRide = async (rideId, driverId) => {
    try {
        const ride = await Ride.findByIdAndUpdate(
            rideId,
            { 
                assingTo: driverId,
                rideStatus: 'ACCEPTED'
            },
            { new: true, runValidators: true }
        )
            .populate('bookedBy')
            .populate('assingTo');
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        return ride;
    } catch (error) {
        throw new Error(`Error assigning driver to ride: ${error.message}`);
    }
};

/**
 * Update ride details
 * @param {String} rideId - The ride ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object>} Updated ride
 */
export const updateRide = async (rideId, updateData) => {
    try {
        const ride = await Ride.findByIdAndUpdate(
            rideId,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('bookedBy')
            .populate('assingTo');
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        return ride;
    } catch (error) {
        throw new Error(`Error updating ride: ${error.message}`);
    }
};

/**
 * Cancel a ride and decline all associated requests
 * @param {String} rideId - The ride ID
 * @returns {Promise<Object>} Cancelled ride with declined requests info
 */
export const cancelRide = async (rideId) => {
    try {
        const ride = await Ride.findById(rideId);
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        if (ride.rideStatus === 'COMPLETED') {
            throw new Error('Cannot cancel a completed ride');
        }
        
        ride.rideStatus = 'CANCELLED';
        await ride.save();
        
        // Decline all pending and approved requests associated with this ride
        const declineResult = await Request.updateMany(
            { 
                requestedFor: rideId,
                requestStatus: { $in: ['PENDING', 'APPROVED'] }
            },
            { 
                requestStatus: 'DECLINED',
                declineReason: 'Ride was cancelled by user'
            }
        );
        
        const populatedRide = await ride.populate(['bookedBy', 'assingTo']);
        
        return {
            ride: populatedRide,
            declinedRequestsCount: declineResult.modifiedCount
        };
    } catch (error) {
        throw new Error(`Error cancelling ride: ${error.message}`);
    }
};

/**
 * Complete a ride
 * @param {String} rideId - The ride ID
 * @returns {Promise<Object>} Completed ride
 */
export const completeRide = async (rideId) => {
    try {
        const ride = await Ride.findById(rideId);
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        if (ride.rideStatus !== 'ONGOING') {
            throw new Error('Only ongoing rides can be completed');
        }
        
        ride.rideStatus = 'COMPLETED';
        await ride.save();
        
        // Mark the approved request as completed
        await Request.updateMany(
            { 
                requestedFor: rideId, 
                requestStatus: 'APPROVED' 
            },
            { 
                requestStatus: 'COMPLETED' 
            }
        );
        
        return await ride.populate(['bookedBy', 'assingTo']);
    } catch (error) {
        throw new Error(`Error completing ride: ${error.message}`);
    }
};

/**
 * Start a ride with OTP verification
 * @param {String} rideId - The ride ID
 * @param {String} otp - The OTP for verification
 * @returns {Promise<Object>} Started ride
 */
export const startRide = async (rideId, otp) => {
    try {
        // Fetch ride with OTP fields (they are select: false by default)
        const ride = await Ride.findById(rideId).select('+startOtp +startOtpExpiresAt');
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        if (ride.rideStatus !== 'ACCEPTED') {
            throw new Error('Only accepted rides can be started');
        }
        
        // Verify OTP
        if (!ride.startOtp) {
            throw new Error('No OTP generated for this ride');
        }
        
        if (!otp) {
            throw new Error('OTP is required to start the ride');
        }
        
        if (ride.startOtp !== otp) {
            throw new Error('Invalid OTP');
        }
        
        if (new Date() > ride.startOtpExpiresAt) {
            throw new Error('OTP has expired');
        }
        
        // OTP verified, start the ride
        ride.rideStatus = 'ONGOING';
        
        // Clear OTP after successful verification
        // ride.startOtp = undefined;
        ride.startOtpExpiresAt = undefined;
        
        await ride.save();
        
        return await ride.populate(['bookedBy', 'assingTo']);
    } catch (error) {
        throw new Error(`Error starting ride: ${error.message}`);
    }
};

/**
 * Delete a ride
 * @param {String} rideId - The ride ID
 * @returns {Promise<Object>} Deleted ride
 */
export const deleteRide = async (rideId) => {
    try {
        const ride = await Ride.findByIdAndDelete(rideId);
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        return ride;
    } catch (error) {
        throw new Error(`Error deleting ride: ${error.message}`);
    }
};

/**
 * Get pending rides
 * @returns {Promise<Array>} List of pending rides
 */
export const getPendingRides = async () => {
    try {
        const rides = await Ride.find({ rideStatus: 'PENDING' })
            .populate('bookedBy')
            .sort({ pickUpDateTime: 1 });
        
        return rides;
    } catch (error) {
        throw new Error(`Error fetching pending rides: ${error.message}`);
    }
};

/**
 * Get ride statistics
 * @param {String} userId - Optional user ID to filter by
 * @returns {Promise<Object>} Ride statistics
 */
export const getRideStatistics = async (userId = null) => {
    try {
        const query = userId ? { $or: [{ bookedBy: userId }, { assingTo: userId }] } : {};
        
        const totalRides = await Ride.countDocuments(query);
        const pendingRides = await Ride.countDocuments({ ...query, rideStatus: 'PENDING' });
        const acceptedRides = await Ride.countDocuments({ ...query, rideStatus: 'ACCEPTED' });
        const ongoingRides = await Ride.countDocuments({ ...query, rideStatus: 'ONGOING' });
        const completedRides = await Ride.countDocuments({ ...query, rideStatus: 'COMPLETED' });
        const cancelledRides = await Ride.countDocuments({ ...query, rideStatus: 'CANCELLED' });
        
        return {
            totalRides,
            pendingRides,
            acceptedRides,
            ongoingRides,
            completedRides,
            cancelledRides
        };
    } catch (error) {
        throw new Error(`Error fetching ride statistics: ${error.message}`);
    }
};

/**
 * Update user online status
 * @param {String} userId - User ID
 * @param {Boolean} isOnline - Online status
 * @param {String} socketId - Socket ID
 * @returns {Promise<Object>} Updated user
 */
export const updateUserOnlineStatus = async (userId, isOnline, socketId = null) => {
    try {
        const updateData = { isOnline };
        if (socketId) {
            updateData.socketId = socketId;
        }
        
        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
        if (!user) {
            throw new Error('User not found');
        }
        
        return user;
    } catch (error) {
        throw new Error(`Error updating user status: ${error.message}`);
    }
};

/**
 * Update user location
 * @param {String} userId - User ID
 * @param {Number} latitude - Latitude
 * @param {Number} longitude - Longitude
 * @returns {Promise<Object>} Updated user
 */
export const updateUserLocation = async (userId, latitude, longitude) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            {
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                lastLocation: {
                    latitude,
                    longitude,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );
        
        if (!user) {
            throw new Error('User not found');
        }
        
        return user;
    } catch (error) {
        throw new Error(`Error updating user location: ${error.message}`);
    }
};

/**
 * Update ride fare
 * @param {String} rideId - Ride ID
 * @param {Number} newFare - New fare amount
 * @returns {Promise<Object>} Updated ride
 */
export const updateRideFare = async (rideId, newFare) => {
    try {
        const ride = await Ride.findById(rideId);
        
        if (!ride) {
            throw new Error('Ride not found');
        }
        
        if (ride.rideStatus !== 'PENDING') {
            throw new Error('Can only update fare for pending rides');
        }
        
        ride.fare = newFare;
        await ride.save();
        
        return await ride.populate(['bookedBy', 'assingTo']);
    } catch (error) {
        throw new Error(`Error updating ride fare: ${error.message}`);
    }
};

/**
 * Get active rides for timeout monitoring
 * @returns {Promise<Array>} List of active rides
 */
export const getActiveRidesForTimeout = async () => {
    try {
        const rides = await Ride.find({
            rideStatus: 'PENDING',
            pickUpDateTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        })
            .populate('bookedBy')
            .sort({ pickUpDateTime: 1 });
        
        return rides;
    } catch (error) {
        throw new Error(`Error fetching active rides: ${error.message}`);
    }
};

/**
 * Get customer ride history by status
 * @param {String} customerId - The customer ID
 * @param {String} status - The ride status (optional)
 * @returns {Promise<Array>} List of rides
 */
export const getCustomerRideHistory = async (customerId, status = null) => {
    try {
        const query = { bookedBy: customerId };
        
        if (status) {
            query.rideStatus = status;
        }
        
        const rides = await Ride.find(query)
            .populate('bookedBy', 'name email phoneNumber')
            .populate('assingTo', 'name phoneNumber')
            .sort({ pickUpDateTime: -1 });
        
        return rides;
    } catch (error) {
        throw new Error(`Error fetching ride history: ${error.message}`);
    }
};

/**
 * Get customer active rides (PENDING, ACCEPTED, ONGOING)
 * @param {String} customerId - The customer ID
 * @returns {Promise<Array>} List of active rides
 */
export const getCustomerActiveRides = async (customerId) => {
    try {
        const rides = await Ride.find({
            bookedBy: customerId,
            rideStatus: { $in: ['PENDING', 'ACCEPTED', 'ONGOING'] }
        })
            .populate('bookedBy', 'name email phoneNumber')
            .populate('assingTo', 'name phoneNumber')
            .sort({ pickUpDateTime: -1 });
        
        return rides;
    } catch (error) {
        throw new Error(`Error fetching active rides: ${error.message}`);
    }
};

/**
 * Get recent 5 ride locations (to/drop) for a customer
 * @param {String} customerId - The customer ID
 * @returns {Promise<Array>} List of recent ride locations
 */
export const getRecentRideLocations = async (customerId) => {
    try {
        const rides = await Ride.find({ bookedBy: customerId })
            .select('to from pickUpDateTime')
            .sort({ pickUpDateTime: -1 })
            .limit(5);
        
        // Map to return only to and from locations
        const locations = rides.map(ride => ({
            to: ride.to,
            from: ride.from
        }));
        
        return locations;
    } catch (error) {
        throw new Error(`Error fetching recent ride locations: ${error.message}`);
    }
};

/**
 * Check if a driver can accept a new ride based on their current accepted rides
 * Rules:
 * - If driver has an ACCEPTED/ONGOING QUICKRIDE: Cannot accept ANY new rides
 * - If driver has an ACCEPTED/ONGOING OUTSTATION: block starts 3 hours before pickup and continues until ride completion
 * - If OUTSTATION block window has not started yet: all ride types are available
 * 
 * @param {String} driverId - The driver ID
 * @param {Object} newRide - The new ride object {rideType, pickUpDateTime}
 * @returns {Promise<Object>} { available: boolean, reason: string }
 */
export const checkDriverAvailability = async (driverId, newRide) => {
    try {
        // Get all accepted or ongoing rides for this driver
        const activeRides = await Ride.find({
            assingTo: driverId,
            rideStatus: { $in: ['ACCEPTED', 'ONGOING'] }
        }).select('rideType pickUpDateTime rideStatus');

        console.log(`[Availability] Checking driver ${driverId} - Found ${activeRides.length} active rides`);
        activeRides.forEach(r => {
            console.log(`  - Active ride: ${r.rideType} scheduled for ${r.pickUpDateTime} (Status: ${r.rideStatus})`);
        });

        // If no active rides, driver is available
        if (activeRides.length === 0) {
            console.log(`[Availability] Driver ${driverId} is AVAILABLE (no active rides)`);
            return { available: true, reason: null };
        }

        // Check all active rides
        const now = new Date();
        const threeHoursInMs = 3 * 60 * 60 * 1000;
        const nowMs = now.getTime();

        // Rule 1: If driver has an active QUICKRIDE, they cannot accept ANY new rides
        const hasActiveQuickRide = activeRides.some((ride) => ride.rideType === 'QUICKRIDE');
        if (hasActiveQuickRide) {
            return {
                available: false,
                reason: 'Driver has an active QUICKRIDE and cannot accept any new rides'
            };
        }

        // Rule 2: Evaluate ALL active OUTSTATION rides.
        // If current time is inside block window of any outstation ride,
        // block new rides for the driver.
        const outstationRides = activeRides.filter((ride) => ride.rideType === 'OUTSTATION');
        console.log(`[Availability] Found ${outstationRides.length} OUTSTATION rides for driver ${driverId}`);
        
        const isBlockedByAnyOutstation = outstationRides.some((outstationRide) => {
            const outstationPickUp = new Date(outstationRide.pickUpDateTime);
            if (Number.isNaN(outstationPickUp.getTime())) {
                console.log(`[Availability] Invalid date for OUTSTATION ride: ${outstationRide.pickUpDateTime}`);
                return false;
            }

            const blockStartTime = outstationPickUp.getTime() - threeHoursInMs;
            const isInBlock = nowMs >= blockStartTime;
            console.log(`[Availability] OUTSTATION ride at ${outstationPickUp} | Block starts at ${new Date(blockStartTime)} | Now ${now} | In block: ${isInBlock}`);
            return isInBlock;
        });

        if (isBlockedByAnyOutstation) {
            console.log(`[Availability] Driver ${driverId} is BLOCKED (OUTSTATION within 3-hour window)`);
            return {
                available: false,
                reason: 'Driver has an OUTSTATION ride and cannot accept new rides from 3 hours before pickup until completion'
            };
        }

        // If we passed all checks, driver is available
        console.log(`[Availability] Driver ${driverId} is AVAILABLE (passed all checks)`);
        return { available: true, reason: null };
    } catch (error) {
        throw new Error(`Error checking driver availability: ${error.message}`);
    }
};

/**
 * Check if a user (owner) can accept a new ride for ANY of their drivers
 * @param {String} userId - The user ID
 * @param {Object} newRide - The new ride object {rideType, pickUpDateTime}
 * @returns {Promise<Object>} { available: boolean, reason: string, availableDrivers: Array }
 */
export const checkUserDriversAvailability = async (userId, newRide) => {
    try {
        // Get all drivers for this user
        const { Driver } = await import('../models/driver.model.js');
        const drivers = await Driver.find({ userId: userId });

        if (drivers.length === 0) {
            return {
                available: false,
                reason: 'No drivers found for this user',
                availableDrivers: []
            };
        }

        // Check availability for each driver
        const availableDrivers = [];
        for (const driver of drivers) {
            const availability = await checkDriverAvailability(driver._id.toString(), newRide);
            if (availability.available) {
                availableDrivers.push(driver);
            }
        }

        if (availableDrivers.length > 0) {
            return {
                available: true,
                reason: null,
                availableDrivers: availableDrivers
            };
        } else {
            return {
                available: false,
                reason: 'All drivers are currently busy with active rides',
                availableDrivers: []
            };
        }
    } catch (error) {
        throw new Error(`Error checking user drivers availability: ${error.message}`);
    }
};
