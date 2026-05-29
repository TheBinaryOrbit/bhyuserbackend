import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateDistanceFromAddresses } from '../utils/googleMaps.js';

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
 * Calculate fare estimate for a ride for all vehicle types
 * @route POST /api/vehicles/calculate-fare
 * @access Public
 */
export const calculateFare = async (req, res) => {
    try {
        let { distanceKm, durationMinutes, origin, destination } = req.body;

        // If origin and destination are provided, calculate distance and duration using Google Maps
        if (origin && destination && (!distanceKm || !durationMinutes)) {
            try {
                const distanceData = await calculateDistanceFromAddresses(origin, destination);
                distanceKm = distanceData.distanceKm;
                // Convert duration from seconds to minutes and round up
                durationMinutes = Math.ceil(distanceData.durationSeconds / 60);
            } catch (mapsError) {
                console.error('Google Maps calculation failed:', mapsError);
                return res.status(400).json({
                    success: false,
                    message: `Failed to calculate distance between locations: ${mapsError.message}`
                });
            }
        }

        if (distanceKm === undefined || durationMinutes === undefined) {
            return res.status(400).json({
                success: false,
                message: 'distanceKm and durationMinutes (or origin and destination) are required'
            });
        }

        const vehicleTypesPath = path.join(__dirname, '../config/vehicleTypes.json');
        const vehicleTypesData = fs.readFileSync(vehicleTypesPath, 'utf8');
        const vehicleTypes = JSON.parse(vehicleTypesData);

        const estimates = vehicleTypes.vehicleTypes.map(vehicleType => {
            const distanceFare = distanceKm * vehicleType.ratePerKm;
            const timeFare = durationMinutes * vehicleType.ratePerMinute;
            const totalFare = vehicleType.baseFare + distanceFare + timeFare;

            return {
                vehicleTypeId: vehicleType.id,
                vehicleTypeName: vehicleType.name,
                capacity: vehicleType.capacity,
                distance: `${parseFloat(distanceKm).toFixed(2)} km`,
                duration: `${Math.ceil(durationMinutes)} min`,
                distanceKm: parseFloat(distanceKm.toFixed(2)),
                durationMinutes: Math.ceil(durationMinutes),
                baseFare: vehicleType.baseFare,
                distanceFare: parseFloat(distanceFare.toFixed(2)),
                timeFare: parseFloat(timeFare.toFixed(2)),
                totalFare: parseFloat(totalFare.toFixed(2)),
                breakdown: {
                    distance: `${parseFloat(distanceKm).toFixed(2)} km × ₹${vehicleType.ratePerKm}/km = ₹${distanceFare.toFixed(2)}`,
                    time: `${Math.ceil(durationMinutes)} min × ₹${vehicleType.ratePerMinute}/min = ₹${timeFare.toFixed(2)}`,
                    base: `Base Fare = ₹${vehicleType.baseFare}`
                }
            };
        });

        res.status(200).json({
            success: true,
            data: estimates,
            distanceInfo: {
                distanceKm: parseFloat(distanceKm.toFixed(2)),
                durationMinutes: Math.ceil(durationMinutes)
            },
            message: 'Fare calculated successfully for all vehicle types'
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
