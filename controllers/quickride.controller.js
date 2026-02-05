import { 
    addQuickRide, 
    getQuickRides, 
    getQuickRideById, 
    updateQuickRide,
    deleteQuickRide 
} from "../service/quickride.service.js";
import { successResponse, errorResponse } from "../utils/responseHelper.js";

export const addQuickRideController = async (req, res) => {
    try {
        const { to, from, customerId, distance, tag } = req.body;

        if (!to || !from || !customerId || !distance || !tag) {
            return errorResponse(res, 400, 'All fields are required');
        }

        const quickRide = await addQuickRide({ to, from, customerId, distance, tag });
        return successResponse(res, 201, 'Quick ride added successfully', quickRide);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

export const getQuickRidesController = async (req, res) => {
    try {
        const { customerId } = req.query;

        if (!customerId) {
            return errorResponse(res, 400, 'Customer ID is required');
        }

        const quickRides = await getQuickRides(customerId);
        return successResponse(res, 200, 'Quick rides fetched successfully', quickRides);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

export const getQuickRideByIdController = async (req, res) => {
    try {
        const { id } = req.params;

        const quickRide = await getQuickRideById(id);
        return successResponse(res, 200, 'Quick ride fetched successfully', quickRide);
    } catch (error) {
        return errorResponse(res, 404, error.message);
    }
};

export const updateQuickRideController = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (Object.keys(updateData).length === 0) {
            return errorResponse(res, 400, 'No data provided for update');
        }

        const quickRide = await updateQuickRide(id, updateData);
        return successResponse(res, 200, 'Quick ride updated successfully', quickRide);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

export const deleteQuickRideController = async (req, res) => {
    try {
        const { id } = req.params;

        const quickRide = await deleteQuickRide(id);
        return successResponse(res, 200, 'Quick ride deleted successfully', quickRide);
    } catch (error) {
        return errorResponse(res, 404, error.message);
    }
};
