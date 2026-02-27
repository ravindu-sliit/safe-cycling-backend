const routeService = require('../services/routeService');
const axios = require('axios');

// POST /api/routes
const createRoute = async (req, res) => {
    try {
        // Notice we DO NOT expect 'distance' from the user anymore
        const { title, startLocation, endLocation, ecoScore } = req.body;

        // 1. Extract coordinates [longitude, latitude] for the API call
        const startCoords = startLocation.coordinates;
        const endCoords = endLocation.coordinates;

        // 2. Build the OpenRouteService API URL
        const orsApiKey = process.env.ORS_API_KEY;
        const orsUrl = `https://api.openrouteservice.org/v2/directions/cycling-regular?api_key=${orsApiKey}&start=${startCoords[0]},${startCoords[1]}&end=${endCoords[0]},${endCoords[1]}`;

        // 3. Make the request to the third-party API
        const orsResponse = await axios.get(orsUrl);

        // 4. Extract the exact distance (ORS returns meters, we convert to km)
        const distanceInMeters = orsResponse.data.features[0].properties.summary.distance;
        const calculatedDistance = parseFloat((distanceInMeters / 1000).toFixed(2));

        // 5. Extract and format the coordinates
        const pathCoordinates = orsResponse.data.features[0].geometry.coordinates.map(coord => ({
            lng: coord[0],
            lat: coord[1]
        }));

        // 6. Construct the final route object to save to MongoDB
        const newRouteData = {
            title,
            startLocation,
            endLocation,
            ecoScore,
            distance: calculatedDistance, 
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
        const updatedRoute = await routeService.updateRoute(req.params.id, req.body);
        if (!updatedRoute) {
            return res.status(404).json({ success: false, message: 'Route not found' });
        }
        res.status(200).json({ success: true, data: updatedRoute });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
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