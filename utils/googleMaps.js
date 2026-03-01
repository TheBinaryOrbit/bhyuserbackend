import { Client } from '@googlemaps/google-maps-services-js';

// Initialize Google Maps client
const client = new Client({});

/**
 * Calculate distance between two addresses using Google Maps Distance Matrix API
 * @param {String} origin - Origin address
 * @param {String} destination - Destination address
 * @returns {Promise<Object>} Distance information (distance in km, duration, status)
 */
export const calculateDistanceFromAddresses = async (origin, destination) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
            throw new Error('Google Maps API key is not configured. Please set GOOGLE_MAPS_API_KEY in environment variables.');
        }

        const response = await client.distancematrix({
            params: {
                origins: [origin],
                destinations: [destination],
                key: apiKey,
                units: 'metric'
            },
            timeout: 10000 // 10 seconds timeout
        });

        if (response.data.status !== 'OK') {
            throw new Error(`Google Maps API error: ${response.data.status}`);
        }

        const element = response.data.rows[0].elements[0];

        if (element.status !== 'OK') {
            throw new Error(`Unable to calculate distance: ${element.status}`);
        }

        // Convert meters to kilometers
        const distanceKm = element.distance.value / 1000;
        const durationSeconds = element.duration.value;

        return {
            distanceKm: parseFloat(distanceKm.toFixed(2)),
            distanceText: element.distance.text,
            durationSeconds,
            durationText: element.duration.text,
            status: 'success'
        };
    } catch (error) {
        console.error('Error calculating distance from Google Maps:', error.message);
        throw new Error(`Failed to calculate distance: ${error.message}`);
    }
};

/**
 * Get geocoding information for an address
 * @param {String} address - Address to geocode
 * @returns {Promise<Object>} Geocoding information
 */
export const geocodeAddress = async (address) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
            throw new Error('Google Maps API key is not configured');
        }

        const response = await client.geocode({
            params: {
                address: address,
                key: apiKey
            },
            timeout: 10000
        });

        if (response.data.status !== 'OK') {
            throw new Error(`Geocoding error: ${response.data.status}`);
        }

        const result = response.data.results[0];
        return {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
            placeId: result.place_id
        };
    } catch (error) {
        console.error('Error geocoding address:', error.message);
        throw new Error(`Failed to geocode address: ${error.message}`);
    }
};
