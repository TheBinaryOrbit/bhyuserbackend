import { 
    createRide,
    getRideById,
    getAllRides,
    getRidesByCustomer,
    getRidesByDriver,
    updateRideStatus,
    assignDriverToRide,
    updateRide,
    cancelRide,
    completeRide,
    startRide,
    deleteRide,
    getPendingRides,
    getRideStatistics,
    updateUserOnlineStatus,
    updateUserLocation,
    findNearbyOnlineUsers,
    updateRideFare
} from '../service/ride.service.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Create a new ride
 */
export const createRideController = async (req, res) => {
    try {
        const rideData = req.body;
        const customerLocation = req.body.customerLocation;

        const result = await createRide(rideData, customerLocation);

        sendSuccess(res, 201, 'Ride created successfully', result);
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get ride by ID
 */
export const getRideByIdController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const ride = await getRideById(rideId);

        sendSuccess(res, 200, 'Ride fetched successfully', { ride });
    } catch (error) {
        sendError(res, error.message === 'Ride not found' ? 404 : 500, error.message);
    }
};

/**
 * Get all rides with filters
 */
export const getAllRidesController = async (req, res) => {
    try {
        const filters = {
            rideStatus: req.query.rideStatus,
            rideType: req.query.rideType,
            vehicleType: req.query.vehicleType,
            bookedBy: req.query.bookedBy,
            assingTo: req.query.assingTo
        };

        // Remove undefined filters
        Object.keys(filters).forEach(key => 
            filters[key] === undefined && delete filters[key]
        );

        const rides = await getAllRides(filters);

        sendSuccess(res, 200, 'Rides fetched successfully', { 
            count: rides.length,
            rides 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get rides by customer
 */
export const getRidesByCustomerController = async (req, res) => {
    try {
        const { customerId } = req.params;
        const rides = await getRidesByCustomer(customerId);

        sendSuccess(res, 200, 'Customer rides fetched successfully', { 
            count: rides.length,
            rides 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get rides by driver
 */
export const getRidesByDriverController = async (req, res) => {
    try {
        const { driverId } = req.params;
        const rides = await getRidesByDriver(driverId);

        sendSuccess(res, 200, 'Driver rides fetched successfully', { 
            count: rides.length,
            rides 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Update ride status
 */
export const updateRideStatusController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { status } = req.body;

        const ride = await updateRideStatus(rideId, status);

        sendSuccess(res, 200, 'Ride status updated successfully', { ride });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};

/**
 * Assign driver to ride
 */
export const assignDriverToRideController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { driverId } = req.body;

        const ride = await assignDriverToRide(rideId, driverId);

        sendSuccess(res, 200, 'Driver assigned successfully', { ride });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 500, error.message);
    }
};

/**
 * Update ride details
 */
export const updateRideController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const updateData = req.body;

        const ride = await updateRide(rideId, updateData);

        sendSuccess(res, 200, 'Ride updated successfully', { ride });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 500, error.message);
    }
};

/**
 * Cancel ride
 */
export const cancelRideController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const ride = await cancelRide(rideId);

        sendSuccess(res, 200, 'Ride cancelled successfully', { ride });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};

/**
 * Complete ride
 */
export const completeRideController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const ride = await completeRide(rideId);

        sendSuccess(res, 200, 'Ride completed successfully', { ride });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};

/**
 * Start ride
 */
export const startRideController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const ride = await startRide(rideId);

        sendSuccess(res, 200, 'Ride started successfully', { ride });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};

/**
 * Delete ride
 */
export const deleteRideController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const ride = await deleteRide(rideId);

        sendSuccess(res, 200, 'Ride deleted successfully', { ride });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 500, error.message);
    }
};

/**
 * Get pending rides
 */
export const getPendingRidesController = async (req, res) => {
    try {
        const rides = await getPendingRides();

        sendSuccess(res, 200, 'Pending rides fetched successfully', { 
            count: rides.length,
            rides 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get ride statistics
 */
export const getRideStatisticsController = async (req, res) => {
    try {
        const { userId } = req.query;
        const statistics = await getRideStatistics(userId);

        sendSuccess(res, 200, 'Ride statistics fetched successfully', { statistics });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Update user online status
 */
export const updateUserOnlineStatusController = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isOnline, socketId } = req.body;

        const user = await updateUserOnlineStatus(userId, isOnline, socketId);

        sendSuccess(res, 200, 'User status updated successfully', { 
            userId: user._id,
            isOnline: user.isOnline
        });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 500, error.message);
    }
};

/**
 * Update user location
 */
export const updateUserLocationController = async (req, res) => {
    try {
        const { userId } = req.params;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return sendError(res, 400, 'Latitude and longitude are required');
        }

        const user = await updateUserLocation(userId, latitude, longitude);

        sendSuccess(res, 200, 'User location updated successfully', { 
            userId: user._id,
            location: user.lastLocation
        });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 500, error.message);
    }
};

/**
 * Find nearby online users
 */
export const findNearbyOnlineUsersController = async (req, res) => {
    try {
        const { latitude, longitude, radius, vehicleType } = req.query;

        if (!latitude || !longitude) {
            return sendError(res, 400, 'Latitude and longitude are required');
        }

        const radiusKm = radius ? parseFloat(radius) : 10;

        const users = await findNearbyOnlineUsers(
            parseFloat(latitude),
            parseFloat(longitude),
            radiusKm,
            vehicleType
        );

        sendSuccess(res, 200, 'Nearby users fetched successfully', { 
            count: users.length,
            radiusKm,
            users 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Update ride fare
 */
export const updateRideFareController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { fare } = req.body;

        if (!fare || fare < 0) {
            return sendError(res, 400, 'Valid fare amount is required');
        }

        const ride = await updateRideFare(rideId, fare);

        sendSuccess(res, 200, 'Ride fare updated successfully', { ride });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};
