import { Request } from "../models/requests.model.js";
import { Driver } from "../models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import { User } from "../models/user.model.js";
import { Ride } from "../models/rides.js";

/**
 * Create a new request
 * @param {Object} requestData - The request data
 * @returns {Promise<Object>} The created request
 */
export const createRequest = async (requestData) => {
    try {
        const request = new Request(requestData);
        await request.save();
        return await request.populate(['driver', 'vehicle', 'requestRaisedBy', 'requestedFor']);
    } catch (error) {
        throw new Error(`Error creating request: ${error.message}`);
    }
};

/**
 * Get request by ID
 * @param {String} requestId - The request ID
 * @returns {Promise<Object>} The request details
 */
export const getRequestById = async (requestId) => {
    try {
        const request = await Request.findById(requestId)
            .populate('driver')
            .populate('vehicle')
            .populate('requestRaisedBy')
            .populate('requestedFor');
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        return request;
    } catch (error) {
        throw new Error(`Error fetching request: ${error.message}`);
    }
};

/**
 * Get all requests with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of requests
 */
export const getAllRequests = async (filters = {}) => {
    try {
        const query = {};
        
        if (filters.requestStatus) {
            query.requestStatus = filters.requestStatus;
        }
        
        if (filters.driver) {
            query.driver = filters.driver;
        }
        
        if (filters.vehicle) {
            query.vehicle = filters.vehicle;
        }
        
        if (filters.requestRaisedBy) {
            query.requestRaisedBy = filters.requestRaisedBy;
        }
        
        if (filters.requestedFor) {
            query.requestedFor = filters.requestedFor;
        }
        
        const requests = await Request.find(query)
            .populate('driver')
            .populate('vehicle')
            .populate('requestRaisedBy')
            .populate('requestedFor')
            .sort({ createdAt: -1 });
        
        return requests;
    } catch (error) {
        throw new Error(`Error fetching requests: ${error.message}`);
    }
};

/**
 * Get requests by driver
 * @param {String} driverId - The driver ID
 * @returns {Promise<Array>} List of requests
 */
export const getRequestsByDriver = async (driverId) => {
    try {
        const requests = await Request.find({ driver: driverId })
            .populate('driver')
            .populate('vehicle')
            .populate('requestRaisedBy')
            .populate('requestedFor')
            .sort({ createdAt: -1 });
        
        return requests;
    } catch (error) {
        throw new Error(`Error fetching driver requests: ${error.message}`);
    }
};

/**
 * Get requests by user (who raised the request)
 * @param {String} userId - The user ID
 * @returns {Promise<Array>} List of requests
 */
export const getRequestsByUser = async (userId) => {
    try {
        const requests = await Request.find({ requestRaisedBy: userId })
            .populate('driver')
            .populate('vehicle')
            .populate('requestRaisedBy')
            .populate('requestedFor')
            .sort({ createdAt: -1 });
        
        return requests;
    } catch (error) {
        throw new Error(`Error fetching user requests: ${error.message}`);
    }
};

/**
 * Get requests for a specific ride
 * @param {String} rideId - The ride ID
 * @returns {Promise<Array>} List of requests
 */
export const getRequestsByRide = async (rideId) => {
    try {
        const requests = await Request.find({ requestedFor: rideId })
            .populate('driver')
            .populate('vehicle')
            .populate('requestRaisedBy')
            .populate('requestedFor')
            .sort({ createdAt: -1 });
        
        return requests;
    } catch (error) {
        throw new Error(`Error fetching ride requests: ${error.message}`);
    }
};

/**
 * Update request status
 * @param {String} requestId - The request ID
 * @param {String} status - The new status
 * @returns {Promise<Object>} Updated request
 */
export const updateRequestStatus = async (requestId, status) => {
    try {
        const validStatuses = ['PENDING', 'APPROVED', 'DECLINED', 'COMPLETED'];
        
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid request status');
        }
        
        const request = await Request.findByIdAndUpdate(
            requestId,
            { requestStatus: status },
            { new: true, runValidators: true }
        )
            .populate('driver')
            .populate('vehicle')
            .populate('requestRaisedBy')
            .populate('requestedFor');
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        return request;
    } catch (error) {
        throw new Error(`Error updating request status: ${error.message}`);
    }
};

/**
 * Approve a request
 * @param {String} requestId - The request ID
 * @returns {Promise<Object>} Approved request
 */
export const approveRequest = async (requestId) => {
    try {
        const request = await Request.findById(requestId);
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        if (request.requestStatus !== 'PENDING') {
            throw new Error('Only pending requests can be approved');
        }
        
        request.requestStatus = 'APPROVED';
        await request.save();
        
        return await request.populate(['driver', 'vehicle', 'requestRaisedBy', 'requestedFor']);
    } catch (error) {
        throw new Error(`Error approving request: ${error.message}`);
    }
};

/**
 * Decline a request
 * @param {String} requestId - The request ID
 * @param {String} reason - Optional reason for declining
 * @returns {Promise<Object>} Declined request
 */
export const declineRequest = async (requestId, reason = null) => {
    try {
        const request = await Request.findById(requestId);
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        if (request.requestStatus !== 'PENDING') {
            throw new Error('Only pending requests can be declined');
        }
        
        request.requestStatus = 'DECLINED';
        if (reason) {
            request.declineReason = reason;
        }
        await request.save();
        
        return await request.populate(['driver', 'vehicle', 'requestRaisedBy', 'requestedFor']);
    } catch (error) {
        throw new Error(`Error declining request: ${error.message}`);
    }
};

/**
 * Complete a request
 * @param {String} requestId - The request ID
 * @returns {Promise<Object>} Completed request
 */
export const completeRequest = async (requestId) => {
    try {
        const request = await Request.findById(requestId);
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        if (request.requestStatus !== 'APPROVED') {
            throw new Error('Only approved requests can be completed');
        }
        
        request.requestStatus = 'COMPLETED';
        await request.save();
        
        return await request.populate(['driver', 'vehicle', 'requestRaisedBy', 'requestedFor']);
    } catch (error) {
        throw new Error(`Error completing request: ${error.message}`);
    }
};

/**
 * Update request details
 * @param {String} requestId - The request ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object>} Updated request
 */
export const updateRequest = async (requestId, updateData) => {
    try {
        const request = await Request.findByIdAndUpdate(
            requestId,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('driver')
            .populate('vehicle')
            .populate('requestRaisedBy')
            .populate('requestedFor');
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        return request;
    } catch (error) {
        throw new Error(`Error updating request: ${error.message}`);
    }
};

/**
 * Delete a request
 * @param {String} requestId - The request ID
 * @returns {Promise<Object>} Deleted request
 */
export const deleteRequest = async (requestId) => {
    try {
        const request = await Request.findByIdAndDelete(requestId);
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        return request;
    } catch (error) {
        throw new Error(`Error deleting request: ${error.message}`);
    }
};

/**
 * Get pending requests
 * @returns {Promise<Array>} List of pending requests
 */
export const getPendingRequests = async () => {
    try {
        const requests = await Request.find({ requestStatus: 'PENDING' })
            .populate('driver')
            .populate('vehicle')
            .populate('requestRaisedBy')
            .populate('requestedFor')
            .sort({ createdAt: 1 });
        
        return requests;
    } catch (error) {
        throw new Error(`Error fetching pending requests: ${error.message}`);
    }
};

/**
 * Get approved requests
 * @returns {Promise<Array>} List of approved requests
 */
export const getApprovedRequests = async () => {
    try {
        const requests = await Request.find({ requestStatus: 'APPROVED' })
            .populate('driver')
            .populate('vehicle')
            .populate('requestRaisedBy')
            .populate('requestedFor')
            .sort({ createdAt: -1 });
        
        return requests;
    } catch (error) {
        throw new Error(`Error fetching approved requests: ${error.message}`);
    }
};

/**
 * Check if a driver has a pending request for a ride
 * @param {String} driverId - The driver ID
 * @param {String} rideId - The ride ID
 * @returns {Promise<Boolean>} True if pending request exists
 */
export const hasDriverPendingRequest = async (driverId, rideId) => {
    try {
        const request = await Request.findOne({
            driver: driverId,
            requestedFor: rideId,
            requestStatus: 'PENDING'
        });
        
        return !!request;
    } catch (error) {
        throw new Error(`Error checking pending request: ${error.message}`);
    }
};

/**
 * Get request statistics
 * @param {String} userId - Optional user ID to filter by
 * @returns {Promise<Object>} Request statistics
 */
export const getRequestStatistics = async (userId = null) => {
    try {
        const query = userId ? { requestRaisedBy: userId } : {};
        
        const totalRequests = await Request.countDocuments(query);
        const pendingRequests = await Request.countDocuments({ ...query, requestStatus: 'PENDING' });
        const approvedRequests = await Request.countDocuments({ ...query, requestStatus: 'APPROVED' });
        const declinedRequests = await Request.countDocuments({ ...query, requestStatus: 'DECLINED' });
        const completedRequests = await Request.countDocuments({ ...query, requestStatus: 'COMPLETED' });
        
        return {
            totalRequests,
            pendingRequests,
            approvedRequests,
            declinedRequests,
            completedRequests
        };
    } catch (error) {
        throw new Error(`Error fetching request statistics: ${error.message}`);
    }
};

/**
 * Bulk approve requests
 * @param {Array} requestIds - Array of request IDs
 * @returns {Promise<Object>} Result of bulk operation
 */
export const bulkApproveRequests = async (requestIds) => {
    try {
        const result = await Request.updateMany(
            { 
                _id: { $in: requestIds },
                requestStatus: 'PENDING'
            },
            { requestStatus: 'APPROVED' }
        );
        
        return {
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        };
    } catch (error) {
        throw new Error(`Error bulk approving requests: ${error.message}`);
    }
};

/**
 * Bulk decline requests
 * @param {Array} requestIds - Array of request IDs
 * @returns {Promise<Object>} Result of bulk operation
 */
export const bulkDeclineRequests = async (requestIds) => {
    try {
        const result = await Request.updateMany(
            { 
                _id: { $in: requestIds },
                requestStatus: 'PENDING'
            },
            { requestStatus: 'DECLINED' }
        );
        
        return {
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        };
    } catch (error) {
        throw new Error(`Error bulk declining requests: ${error.message}`);
    }
};
