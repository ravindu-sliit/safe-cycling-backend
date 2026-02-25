const routeService = require('../services/routeService');

// POST /api/routes
const createRoute = async (req, res) => {
    try {
        const newRoute = await routeService.createRoute(req.body);
        res.status(201).json({ success: true, data: newRoute });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
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