const Route = require('../models/Route');

// Create a new route
const createRoute = async (routeData) => {
    const route = new Route(routeData);
    return await route.save();
};

// Get all routes
const getAllRoutes = async () => {
    return await Route.find();
};

// Update an existing route by ID
const updateRoute = async (id, updateData) => {
    return await Route.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

// Delete a route by ID
const deleteRoute = async (id) => {
    return await Route.findByIdAndDelete(id);
};

module.exports = {
    createRoute,
    getAllRoutes,
    updateRoute,
    deleteRoute
};