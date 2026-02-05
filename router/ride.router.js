import express from 'express';
import {
    createRideController,
    getRideByIdController,
    getAllRidesController,
    getRidesByCustomerController,
    getRidesByDriverController,
    updateRideStatusController,
    assignDriverToRideController,
    updateRideController,
    cancelRideController,
    completeRideController,
    startRideController,
    deleteRideController,
    getPendingRidesController,
    getRideStatisticsController,
    updateUserOnlineStatusController,
    updateUserLocationController,
    findNearbyOnlineUsersController,
    updateRideFareController,
    getCustomerRideHistoryController,
    getCustomerActiveRidesController
} from '../controllers/ride.controller.js';
import {
    createRequestController,
    getRequestByIdController,
    getAllRequestsController,
    getRequestsByDriverController,
    getRequestsByUserController,
    getRequestsByRideController,
    updateRequestStatusController,
    approveRequestController,
    declineRequestController,
    completeRequestController,
    updateRequestController,
    deleteRequestController,
    getPendingRequestsController,
    getApprovedRequestsController,
    hasDriverPendingRequestController,
    getRequestStatisticsController,
    bulkApproveRequestsController,
    bulkDeclineRequestsController
} from '../controllers/request.controller.js';

const router = express.Router();

// ============ RIDE ROUTES ============

/**
 * @route   POST /api/rides
 * @desc    Create a new ride
 * @access  Private (Customer)
 */
router.post('/rides', createRideController);

/**
 * @route   GET /api/rides/:rideId
 * @desc    Get ride by ID
 * @access  Private
 */
router.get('/rides/:rideId', getRideByIdController);

/**
 * @route   GET /api/rides
 * @desc    Get all rides with optional filters
 * @query   rideStatus, rideType, vehicleType, bookedBy, assingTo
 * @access  Private
 */
router.get('/rides', getAllRidesController);

/**
 * @route   GET /api/rides/customer/:customerId
 * @desc    Get rides by customer
 * @access  Private
 */
router.get('/rides/customer/:customerId', getRidesByCustomerController);

/**
 * @route   GET /api/rides/driver/:driverId
 * @desc    Get rides by driver
 * @access  Private
 */
router.get('/rides/driver/:driverId', getRidesByDriverController);

/**
 * @route   GET /api/rides/pending/all
 * @desc    Get all pending rides
 * @access  Private
 */
router.get('/rides/pending/all', getPendingRidesController);

/**
 * @route   GET /api/rides/statistics/summary
 * @desc    Get ride statistics
 * @query   userId (optional)
 * @access  Private
 */
router.get('/rides/statistics/summary', getRideStatisticsController);

/**
 * @route   PUT /api/rides/:rideId/status
 * @desc    Update ride status
 * @access  Private
 */
router.put('/rides/:rideId/status', updateRideStatusController);

/**
 * @route   PUT /api/rides/:rideId/assign-driver
 * @desc    Assign driver to ride
 * @access  Private
 */
router.put('/rides/:rideId/assign-driver', assignDriverToRideController);

/**
 * @route   PUT /api/rides/:rideId
 * @desc    Update ride details
 * @access  Private
 */
router.put('/rides/:rideId', updateRideController);

/**
 * @route   PUT /api/rides/:rideId/fare
 * @desc    Update ride fare
 * @access  Private (Customer)
 */
router.put('/rides/:rideId/fare', updateRideFareController);

/**
 * @route   PUT /api/rides/:rideId/cancel
 * @desc    Cancel ride
 * @access  Private
 */
router.put('/rides/:rideId/cancel', cancelRideController);

/**
 * @route   PUT /api/rides/:rideId/complete
 * @desc    Complete ride
 * @access  Private (Driver)
 */
router.put('/rides/:rideId/complete', completeRideController);

/**
 * @route   PUT /api/rides/:rideId/start
 * @desc    Start ride
 * @access  Private (Driver)
 */
router.put('/rides/:rideId/start', startRideController);

/**
 * @route   GET /api/rides/customer/:customerId/history
 * @desc    Get customer ride history with optional status filter
 * @query   status (optional) - PENDING, ACCEPTED, ONGOING, COMPLETED, CANCELLED, DEFAULTED
 * @access  Private (Customer)
 */
router.get('/rides/customer/:customerId/history', getCustomerRideHistoryController);

/**
 * @route   GET /api/rides/customer/:customerId/active
 * @desc    Get customer active rides (PENDING, ACCEPTED, ONGOING)
 * @access  Private (Customer)
 */
router.get('/rides/customer/:customerId/active', getCustomerActiveRidesController);

/**
 * @route   DELETE /api/rides/:rideId
 * @desc    Delete ride
 * @access  Private (Admin)
 */
router.delete('/rides/:rideId', deleteRideController);

// ============ USER LOCATION & STATUS ROUTES ============

/**
 * @route   PUT /api/users/:userId/status
 * @desc    Update user online status
 * @access  Private
 */
router.put('/users/:userId/status', updateUserOnlineStatusController);

/**
 * @route   PUT /api/users/:userId/location
 * @desc    Update user location
 * @access  Private
 */
router.put('/users/:userId/location', updateUserLocationController);

/**
 * @route   GET /api/users/nearby
 * @desc    Find nearby online users
 * @query   latitude, longitude, radius (optional), vehicleType (optional)
 * @access  Private
 */
router.get('/users/nearby', findNearbyOnlineUsersController);

// ============ REQUEST ROUTES ============

/**
 * @route   POST /api/requests
 * @desc    Create a new request
 * @access  Private (Driver/Owner)
 */
router.post('/requests', createRequestController);

/**
 * @route   GET /api/requests/:requestId
 * @desc    Get request by ID
 * @access  Private
 */
router.get('/requests/:requestId', getRequestByIdController);

/**
 * @route   GET /api/requests
 * @desc    Get all requests with optional filters
 * @query   requestStatus, driver, vehicle, requestRaisedBy, requestedFor
 * @access  Private
 */
router.get('/requests', getAllRequestsController);

/**
 * @route   GET /api/requests/driver/:driverId
 * @desc    Get requests by driver
 * @access  Private
 */
router.get('/requests/driver/:driverId', getRequestsByDriverController);

/**
 * @route   GET /api/requests/user/:userId
 * @desc    Get requests by user (who raised the request)
 * @access  Private
 */
router.get('/requests/user/:userId', getRequestsByUserController);

/**
 * @route   GET /api/requests/ride/:rideId
 * @desc    Get requests for a specific ride
 * @access  Private
 */
router.get('/requests/ride/:rideId', getRequestsByRideController);

/**
 * @route   GET /api/requests/pending/all
 * @desc    Get all pending requests
 * @access  Private
 */
router.get('/requests/pending/all', getPendingRequestsController);

/**
 * @route   GET /api/requests/approved/all
 * @desc    Get all approved requests
 * @access  Private
 */
router.get('/requests/approved/all', getApprovedRequestsController);

/**
 * @route   GET /api/requests/check/:driverId/:rideId
 * @desc    Check if driver has pending request for a ride
 * @access  Private
 */
router.get('/requests/check/:driverId/:rideId', hasDriverPendingRequestController);

/**
 * @route   GET /api/requests/statistics/summary
 * @desc    Get request statistics
 * @query   userId (optional)
 * @access  Private
 */
router.get('/requests/statistics/summary', getRequestStatisticsController);

/**
 * @route   PUT /api/requests/:requestId/status
 * @desc    Update request status
 * @access  Private
 */
router.put('/requests/:requestId/status', updateRequestStatusController);

/**
 * @route   PUT /api/requests/:requestId/approve
 * @desc    Approve request
 * @access  Private (Customer)
 */
router.put('/requests/:requestId/approve', approveRequestController);

/**
 * @route   PUT /api/requests/:requestId/decline
 * @desc    Decline request
 * @access  Private (Customer)
 */
router.put('/requests/:requestId/decline', declineRequestController);

/**
 * @route   PUT /api/requests/:requestId/complete
 * @desc    Complete request
 * @access  Private
 */
router.put('/requests/:requestId/complete', completeRequestController);

/**
 * @route   PUT /api/requests/:requestId
 * @desc    Update request details
 * @access  Private
 */
router.put('/requests/:requestId', updateRequestController);

/**
 * @route   POST /api/requests/bulk/approve
 * @desc    Bulk approve requests
 * @access  Private (Admin)
 */
router.post('/requests/bulk/approve', bulkApproveRequestsController);

/**
 * @route   POST /api/requests/bulk/decline
 * @desc    Bulk decline requests
 * @access  Private (Admin)
 */
router.post('/requests/bulk/decline', bulkDeclineRequestsController);

/**
 * @route   DELETE /api/requests/:requestId
 * @desc    Delete request
 * @access  Private (Admin)
 */
router.delete('/requests/:requestId', deleteRequestController);

export default router;
