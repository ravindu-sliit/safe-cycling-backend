const express = require('express');
const hazardController = require('../controllers/hazardController');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// GET / & GET /:id -> Public
router.get('/', hazardController.getAllHazards);
router.get('/:id', hazardController.getHazardById);

// POST / -> User, Admin, Organization (Any logged-in user)
router.post('/', protect, authorize('user', 'admin', 'organization'), hazardController.createHazard);

// PUT /:id -> Admin, Organization
router.put('/:id', protect, authorize('admin', 'organization'), hazardController.updateHazard);

// DELETE /:id -> Admin only
router.delete('/:id', protect, authorize('admin'), hazardController.deleteHazard);

module.exports = router;
