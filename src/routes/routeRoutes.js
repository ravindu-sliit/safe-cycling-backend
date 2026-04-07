const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET / -> Public
router.get('/', routeController.getRoutes);

// POST / -> Admin, Organization
router.post('/', protect, authorize('admin', 'organization'), routeController.createRoute);

// PUT /:id -> Admin, Organization
router.put('/:id', protect, authorize('admin', 'organization'), routeController.updateRoute);

// DELETE /:id -> Admin only
router.delete('/:id', protect, authorize('admin'), routeController.deleteRoute);

module.exports = router;