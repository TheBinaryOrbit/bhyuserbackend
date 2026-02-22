import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all vehicle types with pricing information
 * @route GET /api/vehicles/types
 * @access Public
 */
export const getVehicleTypes = (req, res) => {
    try {
        const vehicleTypesPath = path.join(__dirname, '../config/vehicleTypes.json');
        const vehicleTypesData = fs.readFileSync(vehicleTypesPath, 'utf8');
        const vehicleTypes = JSON.parse(vehicleTypesData);

        res.status(200).json({
            success: true,
            data: vehicleTypes.vehicleTypes,
            metadata: vehicleTypes.metadata,
            message: 'Vehicle types retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching vehicle types:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve vehicle types',
            error: error.message
        });
    }
};

/**
 * Get a specific vehicle type by ID
 * @route GET /api/vehicles/types/:id
 * @access Public
 */
export const getVehicleTypeById = (req, res) => {
    try {
        const { id } = req.params;
        const vehicleTypesPath = path.join(__dirname, '../config/vehicleTypes.json');
        const vehicleTypesData = fs.readFileSync(vehicleTypesPath, 'utf8');
        const vehicleTypes = JSON.parse(vehicleTypesData);

        const vehicleType = vehicleTypes.vehicleTypes.find(v => v.id === id);

        if (!vehicleType) {
            return res.status(404).json({
                success: false,
                message: `Vehicle type '${id}' not found`
            });
        }

        res.status(200).json({
            success: true,
            data: vehicleType,
            message: 'Vehicle type retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching vehicle type:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve vehicle type',
            error: error.message
        });
    }
};

/**
 * Calculate fare estimate for a ride
 * @route POST /api/vehicles/calculate-fare
 * @access Public
 */
export const calculateFare = (req, res) => {
    try {
        const { vehicleTypeId, distanceKm, durationMinutes } = req.body;

        if (!vehicleTypeId || !distanceKm || !durationMinutes) {
            return res.status(400).json({
                success: false,
                message: 'vehicleTypeId, distanceKm, and durationMinutes are required'
            });
        }

        const vehicleTypesPath = path.join(__dirname, '../config/vehicleTypes.json');
        const vehicleTypesData = fs.readFileSync(vehicleTypesPath, 'utf8');
        const vehicleTypes = JSON.parse(vehicleTypesData);

        const vehicleType = vehicleTypes.vehicleTypes.find(v => v.id === vehicleTypeId);

        if (!vehicleType) {
            return res.status(404).json({
                success: false,
                message: `Vehicle type '${vehicleTypeId}' not found`
            });
        }

        const distanceFare = distanceKm * vehicleType.ratePerKm;
        const timeFare = durationMinutes * vehicleType.ratePerMinute;
        const totalFare = vehicleType.baseFare + distanceFare + timeFare;

        res.status(200).json({
            success: true,
            data: {
                vehicleType: vehicleType.name,
                baseFare: vehicleType.baseFare,
                distanceFare: parseFloat(distanceFare.toFixed(2)),
                timeFare: parseFloat(timeFare.toFixed(2)),
                totalFare: parseFloat(totalFare.toFixed(2)),
                breakdown: {
                    distance: `${distanceKm} km × ₹${vehicleType.ratePerKm}/km = ₹${distanceFare.toFixed(2)}`,
                    time: `${durationMinutes} min × ₹${vehicleType.ratePerMinute}/min = ₹${timeFare.toFixed(2)}`,
                    base: `Base Fare = ₹${vehicleType.baseFare}`
                }
            },
            message: 'Fare calculated successfully'
        });
    } catch (error) {
        console.error('Error calculating fare:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate fare',
            error: error.message
        });
    }
};
