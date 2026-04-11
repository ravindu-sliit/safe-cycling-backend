const reviewService = require('../services/reviewService');
const Review = require('../models/Review');

const ALLOWED_REVIEW_FIELDS = ['route', 'rating', 'comment', 'difficulty', 'distance', 'pitStops'];
const LEGACY_RATING_FIELDS = ['ecoRating', 'safatyRating', 'safetyRating'];

const sanitizeReviewPayload = (payload, { allowRoute }) => {
    const input = payload || {};
    const hasLegacyFields = LEGACY_RATING_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(input, field));

    if (hasLegacyFields) {
        const error = new Error('Use "rating" instead of eco/safety rating fields');
        error.statusCode = 400;
        throw error;
    }

    return ALLOWED_REVIEW_FIELDS.reduce((acc, key) => {
        if (!allowRoute && key === 'route') return acc;
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            acc[key] = input[key];
        }
        return acc;
    }, {});
};

// POST /api/reviews
const createReview = async (req, res) => {
    try {
        const sanitizedBody = sanitizeReviewPayload(req.body, { allowRoute: true });
        // Attach the current logged-in user to the review being created
        sanitizedBody.user = req.user._id;
        const created = await reviewService.createReview(sanitizedBody);
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

        const sanitizedBody = sanitizeReviewPayload(req.body, { allowRoute: false });
        const updated = await reviewService.updateReview(req.params.id, sanitizedBody);
        
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
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

// POST /api/reviews/:id/vote
const voteOnReview = async (req, res) => {
    try {
        const { type } = req.body; // Expecting { "type": "up" } or { "type": "down" }
        if (!['up', 'down'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid vote type' });
        }

        // Pass the review ID, the current user's ID, and the vote type
        const updated = await reviewService.voteReview(req.params.id, req.user._id, type);
        
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        res.status(200).json({ success: true, data: updated });
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
    deleteReview,
    voteOnReview
};