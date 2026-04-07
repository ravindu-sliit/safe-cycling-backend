const reviewService = require('../services/reviewService');
const Review = require('../models/Review');

// POST /api/reviews
const createReview = async (req, res) => {
    try {
        // Attach the current logged-in user to the review being created
        req.body.user = req.user._id;
        const created = await reviewService.createReview(req.body);
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        const status = error.statusCode || 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

// GET /api/reviews
const getAllReviews = async (req, res) => {
    try {
        const result = await reviewService.getAllReviews();
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        const status = error.statusCode || 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

// GET /api/reviews/route/:routeId
const getReviewsByRoute = async (req, res) => {
    try {
        const result = await reviewService.getReviewsByRouteId(req.params.routeId);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        const status = error.statusCode || 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

// PUT /api/reviews/:id
const updateReview = async (req, res) => {
    try {
        // Fetch the review to check ownership
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Resource-based ownership check: allow if owner OR admin
        if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: You can only update your own reviews' 
            });
        }

        const updated = await reviewService.updateReview(req.params.id, req.body);
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        const status = error.statusCode || 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

// DELETE /api/reviews/:id
const deleteReview = async (req, res) => {
    try {
        const deleted = await reviewService.deleteReview(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        res.status(200).json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        const status = error.statusCode || 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

module.exports = {
    createReview,
    getAllReviews,
    getReviewsByRoute,
    updateReview,
    deleteReview
};

