import express from 'express';
import { getVehicleTypes, getVehicleTypeById, calculateFare } from '../controllers/vehicle.controller.js';

const vehicleRouter = express.Router();

// Get all vehicle types
vehicleRouter.get('/types', getVehicleTypes);

// Get specific vehicle type by ID
vehicleRouter.get('/types/:id', getVehicleTypeById);

// Calculate fare estimate
vehicleRouter.post('/calculate-fare', calculateFare);

export default vehicleRouter;