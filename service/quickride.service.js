import { QuickRide } from "../models/quickride.model.js";

export const addQuickRide = async (quickRideData) => {
    try {
        const quickRide = new QuickRide(quickRideData);
        await quickRide.save();
        return quickRide;
    } catch (error) {
        throw new Error(`Error adding quick ride: ${error.message}`);
    }
};

export const getQuickRides = async (customerId) => {
    try {
        const quickRides = await QuickRide.find({ customerId }).populate('customerId', 'name email phone');
        return quickRides;
    } catch (error) {
        throw new Error(`Error fetching quick rides: ${error.message}`);
    }
};

export const getQuickRideById = async (quickRideId) => {
    try {
        const quickRide = await QuickRide.findById(quickRideId).populate('customerId', 'name email phone');
        if (!quickRide) {
            throw new Error('Quick ride not found');
        }
        return quickRide;
    } catch (error) {
        throw new Error(`Error fetching quick ride: ${error.message}`);
    }
};

export const updateQuickRide = async (quickRideId, updateData) => {
    try {
        const quickRide = await QuickRide.findByIdAndUpdate(
            quickRideId,
            updateData,
            { new: true, runValidators: true }
        ).populate('customerId', 'name email phone');
        
        if (!quickRide) {
            throw new Error('Quick ride not found');
        }
        return quickRide;
    } catch (error) {
        throw new Error(`Error updating quick ride: ${error.message}`);
    }
};

export const deleteQuickRide = async (quickRideId) => {
    try {
        const quickRide = await QuickRide.findByIdAndDelete(quickRideId);
        if (!quickRide) {
            throw new Error('Quick ride not found');
        }
        return quickRide;
    } catch (error) {
        throw new Error(`Error deleting quick ride: ${error.message}`);
    }
};
