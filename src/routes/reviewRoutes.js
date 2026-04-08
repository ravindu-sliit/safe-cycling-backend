const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET / -> Admin only
router.get('/', protect, authorize('admin'), reviewController.getAllReviews);

// GET /route/:routeId -> Public
router.get('/route/:routeId', reviewController.getReviewsByRoute);

// POST / -> User only
router.post('/', protect, authorize('user'), reviewController.createReview);

// PUT /:id -> User, Admin
router.put('/:id', protect, authorize('user', 'admin'), reviewController.updateReview);

// DELETE /:id -> Admin only
router.delete('/:id', protect, authorize('admin'), reviewController.deleteReview);

module.exports = router;

