import { 
    createRequest,
    getRequestById,
    getAllRequests,
    getRequestsByDriver,
    getRequestsByUser,
    getRequestsByRide,
    updateRequestStatus,
    approveRequest,
    declineRequest,
    cancelRequest,
    completeRequest,
    updateRequest,
    deleteRequest,
    getPendingRequests,
    getApprovedRequests,
    hasDriverPendingRequest,
    getRequestStatistics,
    bulkApproveRequests,
    bulkDeclineRequests,
    getActiveRequestsByUser,
    hasUserActiveRequest,
    declineTimedOutRequests
} from '../service/request.service.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Create a new request
 */
export const createRequestController = async (req, res) => {
    try {
        const requestData = req.body;
        const request = await createRequest(requestData);

        sendSuccess(res, 201, 'Request created successfully', { request });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get request by ID
 */
export const getRequestByIdController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const request = await getRequestById(requestId);

        sendSuccess(res, 200, 'Request fetched successfully', { request });
    } catch (error) {
        sendError(res, error.message === 'Request not found' ? 404 : 500, error.message);
    }
};

/**
 * Get all requests with filters
 */
export const getAllRequestsController = async (req, res) => {
    try {
        const filters = {
            requestStatus: req.query.requestStatus,
            driver: req.query.driver,
            vehicle: req.query.vehicle,
            requestRaisedBy: req.query.requestRaisedBy,
            requestedFor: req.query.requestedFor
        };

        // Remove undefined filters
        Object.keys(filters).forEach(key => 
            filters[key] === undefined && delete filters[key]
        );

        const requests = await getAllRequests(filters);

        sendSuccess(res, 200, 'Requests fetched successfully', { 
            count: requests.length,
            requests 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get requests by driver
 */
export const getRequestsByDriverController = async (req, res) => {
    try {
        const { driverId } = req.params;
        const requests = await getRequestsByDriver(driverId);

        sendSuccess(res, 200, 'Driver requests fetched successfully', { 
            count: requests.length,
            requests 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get requests by user
 */
export const getRequestsByUserController = async (req, res) => {
    try {
        const { userId } = req.params;
        const requests = await getRequestsByUser(userId);

        sendSuccess(res, 200, 'User requests fetched successfully', { 
            count: requests.length,
            requests 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get requests by ride
 */
export const getRequestsByRideController = async (req, res) => {
    try {
        const { rideId } = req.params;
        const requests = await getRequestsByRide(rideId);

        sendSuccess(res, 200, 'Ride requests fetched successfully', { 
            count: requests.length,
            requests 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Update request status
 */
export const updateRequestStatusController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;

        const request = await updateRequestStatus(requestId, status);

        sendSuccess(res, 200, 'Request status updated successfully', { request });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};

/**
 * Approve request
 */
export const approveRequestController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const request = await approveRequest(requestId);

        sendSuccess(res, 200, 'Request approved successfully', { request });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};

/**
 * Decline request
 */
export const declineRequestController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { reason } = req.body;

        const result = await declineRequest(requestId, reason);

        sendSuccess(res, 200, 'Request declined successfully', result);
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};

/**
 * Cancel request (declines all requests for the ride)
 */
export const cancelRequestController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { reason } = req.body;

        const result = await cancelRequest(requestId, reason);

        sendSuccess(res, 200, 'Request cancelled successfully. All related requests have been declined.', result);
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};

/**
 * Complete request
 */
export const completeRequestController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const request = await completeRequest(requestId);

        sendSuccess(res, 200, 'Request completed successfully', { request });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 400, error.message);
    }
};

/**
 * Update request details
 */
export const updateRequestController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const updateData = req.body;

        const request = await updateRequest(requestId, updateData);

        sendSuccess(res, 200, 'Request updated successfully', { request });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 500, error.message);
    }
};

/**
 * Delete request
 */
export const deleteRequestController = async (req, res) => {
    try {
        const { requestId } = req.params;
        const request = await deleteRequest(requestId);

        sendSuccess(res, 200, 'Request deleted successfully', { request });
    } catch (error) {
        sendError(res, error.message.includes('not found') ? 404 : 500, error.message);
    }
};

/**
 * Get pending requests
 */
export const getPendingRequestsController = async (req, res) => {
    try {
        const requests = await getPendingRequests();

        sendSuccess(res, 200, 'Pending requests fetched successfully', { 
            count: requests.length,
            requests 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get approved requests
 */
export const getApprovedRequestsController = async (req, res) => {
    try {
        const requests = await getApprovedRequests();

        sendSuccess(res, 200, 'Approved requests fetched successfully', { 
            count: requests.length,
            requests 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Check if driver has pending request for a ride
 */
export const hasDriverPendingRequestController = async (req, res) => {
    try {
        const { driverId, rideId } = req.params;
        const hasPending = await hasDriverPendingRequest(driverId, rideId);

        sendSuccess(res, 200, 'Check completed', { hasPendingRequest: hasPending });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get request statistics
 */
export const getRequestStatisticsController = async (req, res) => {
    try {
        const { userId } = req.query;
        const statistics = await getRequestStatistics(userId);

        sendSuccess(res, 200, 'Request statistics fetched successfully', { statistics });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Bulk approve requests
 */
export const bulkApproveRequestsController = async (req, res) => {
    try {
        const { requestIds } = req.body;

        if (!Array.isArray(requestIds) || requestIds.length === 0) {
            return sendError(res, 400, 'Request IDs array is required');
        }

        const result = await bulkApproveRequests(requestIds);

        sendSuccess(res, 200, 'Requests approved successfully', { result });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Bulk decline requests
 */
export const bulkDeclineRequestsController = async (req, res) => {
    try {
        const { requestIds } = req.body;

        if (!Array.isArray(requestIds) || requestIds.length === 0) {
            return sendError(res, 400, 'Request IDs array is required');
        }

        const result = await bulkDeclineRequests(requestIds);

        sendSuccess(res, 200, 'Requests declined successfully', { result });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Get active requests by user (PENDING or APPROVED)
 */
export const getActiveRequestsByUserController = async (req, res) => {
    try {
        const { userId } = req.params;
        const requests = await getActiveRequestsByUser(userId);

        sendSuccess(res, 200, 'Active user requests fetched successfully', { 
            count: requests.length,
            hasActiveRequests: requests.length > 0,
            requests 
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Check if user has any active requests
 */
export const checkUserActiveRequestController = async (req, res) => {
    try {
        const { userId } = req.params;
        const hasActiveRequest = await hasUserActiveRequest(userId);

        sendSuccess(res, 200, 'Active request check completed', { 
            hasActiveRequests: hasActiveRequest
        });
    } catch (error) {
        sendError(res, 500, error.message);
    }
};

/**
 * Manually decline all timed-out pending requests
 */
export const declineTimedOutRequestsController = async (req, res) => {
    try {
        const timeoutMinutes = parseInt(req.query.timeoutMinutes) || 5;
        const result = await declineTimedOutRequests(timeoutMinutes);

        sendSuccess(res, 200, 'Timed-out requests processed successfully', result);
    } catch (error) {
        sendError(res, 500, error.message);
    }
};
