const express = require('express');
const hazardController = require('../controllers/HazardController');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { parseSingleImageUpload } = require('../middleware/imageUploadMiddleware');

// GET / & GET /:id -> Public
router.get('/', hazardController.getAllHazards);
router.get('/:id', hazardController.getHazardById);

// POST /upload-image -> Any logged-in user
router.post(
    '/upload-image',
    protect,
    authorize('user', 'admin', 'organization'),
    parseSingleImageUpload,
    hazardController.uploadImage
);

// POST / -> User, Admin, Organization (Any logged-in user)
router.post('/', protect, authorize('user', 'admin', 'organization'), hazardController.createHazard);

// PUT /:id/like -> Any logged-in user toggles like
router.put('/:id/like', protect, authorize('user', 'admin', 'organization'), hazardController.toggleLikeHazard);

// PUT /:id -> Any logged-in user (user, admin, organization)
router.put('/:id', protect, authorize('user', 'admin', 'organization'), hazardController.updateHazard);

// PUT /:id/updates/:updateId -> update owner, hazard owner, or admin
router.put('/:id/updates/:updateId', protect, authorize('user', 'admin', 'organization'), hazardController.updateCommunityHazardUpdate);

// DELETE /:id/updates/:updateId -> update owner, hazard owner, or admin
router.delete('/:id/updates/:updateId', protect, authorize('user', 'admin', 'organization'), hazardController.deleteCommunityHazardUpdate);

// DELETE /:id -> Users can delete own hazards; admin can delete any
router.delete('/:id', protect, authorize('user', 'admin', 'organization'), hazardController.deleteHazard);

module.exports = router;
