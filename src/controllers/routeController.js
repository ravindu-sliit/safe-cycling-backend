const routeService = require('../services/routeService');
const axios = require('axios');

const buildRouteDetails = async (startCoords, endCoords) => {
    const orsApiKey = process.env.ORS_API_KEY;
    const orsUrl = `https://api.openrouteservice.org/v2/directions/cycling-regular?api_key=${orsApiKey}&start=${startCoords[0]},${startCoords[1]}&end=${endCoords[0]},${endCoords[1]}`;
    const orsResponse = await axios.get(orsUrl);

    const distanceInMeters = orsResponse.data.features[0].properties.summary.distance;
    const distance = parseFloat((distanceInMeters / 1000).toFixed(2));
    const pathCoordinates = orsResponse.data.features[0].geometry.coordinates.map(coord => ({
        lng: coord[0],
        lat: coord[1]
    }));

    return { distance, pathCoordinates };
};

// POST /api/routes
const createRoute = async (req, res) => {
    try {
        // Notice we DO NOT expect 'distance' from the user anymore
        const { title, startLocation, endLocation, ecoScore } = req.body;

        // 1. Extract coordinates [longitude, latitude] for the API call
        const startCoords = startLocation.coordinates;
        const endCoords = endLocation.coordinates;

        // 2. Calculate route geometry and distance from OpenRouteService
        const { distance, pathCoordinates } = await buildRouteDetails(startCoords, endCoords);

        // 6. Construct the final route object to save to MongoDB
        const newRouteData = {
            title,
            startLocation,
            endLocation,
            ecoScore,
            distance,
            pathCoordinates 
        };

        // 7. Save to database using your clean service layer
        const newRoute = await routeService.createRoute(newRouteData);

        res.status(201).json({ success: true, data: newRoute });
    } catch (error) {
        console.error("Third-Party API or Database Error:", error.message);
        res.status(400).json({ success: false, message: "Could not calculate route. Please check coordinates." });
    }
};


// GET /api/routes
const getRoutes = async (req, res) => {
    try {
        const routes = await routeService.getAllRoutes();
        res.status(200).json({ success: true, count: routes.length, data: routes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// PUT /api/routes/:id
const updateRoute = async (req, res) => {
    try {
        const existingRoute = await routeService.getRouteById(req.params.id);
        if (!existingRoute) {
            return res.status(404).json({ success: false, message: 'Route not found' });
        }

        const updateData = { ...req.body };
        const locationChanged = Boolean(updateData.startLocation || updateData.endLocation);

        if (locationChanged) {
            const startLocation = updateData.startLocation || existingRoute.startLocation;
            const endLocation = updateData.endLocation || existingRoute.endLocation;

            const startCoords = startLocation?.coordinates;
            const endCoords = endLocation?.coordinates;

            if (!Array.isArray(startCoords) || startCoords.length !== 2 || !Array.isArray(endCoords) || endCoords.length !== 2) {
                return res.status(400).json({ success: false, message: 'startLocation.coordinates and endLocation.coordinates must be [longitude, latitude].' });
            }

            const { distance, pathCoordinates } = await buildRouteDetails(startCoords, endCoords);
            updateData.distance = distance;
            updateData.pathCoordinates = pathCoordinates;
        }

        const updatedRoute = await routeService.updateRoute(req.params.id, updateData);
        if (!updatedRoute) {
            return res.status(404).json({ success: false, message: 'Route not found' });
        }
        res.status(200).json({ success: true, data: updatedRoute });
    } catch (error) {
        console.error('Route update error:', error.message);
        res.status(400).json({ success: false, message: 'Could not update route. Please check route data and coordinates.' });
    }
};

// DELETE /api/routes/:id
const deleteRoute = async (req, res) => {
    try {
        const deletedRoute = await routeService.deleteRoute(req.params.id);
        if (!deletedRoute) {
            return res.status(404).json({ success: false, message: 'Route not found' });
        }
        res.status(200).json({ success: true, message: 'Route deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createRoute,
    getRoutes,
    updateRoute,
    deleteRoute
};