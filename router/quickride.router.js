import express from 'express';
import { 
    addQuickRideController, 
    getQuickRidesController, 
    getQuickRideByIdController,
    updateQuickRideController,
    deleteQuickRideController
} from '../controllers/quickride.controller.js';

const quickrideRouter = express.Router();

// Add a new quick ride
quickrideRouter.post('/add', addQuickRideController);

// Get all quick rides for a customer
quickrideRouter.get('/', getQuickRidesController);

// Get a specific quick ride by ID
quickrideRouter.get('/:id', getQuickRideByIdController);

// Update a quick ride
quickrideRouter.patch('/:id', updateQuickRideController);

// Delete a quick ride
quickrideRouter.delete('/:id', deleteQuickRideController);

export default quickrideRouter;
