const mongoose = require('mongoose');
const Review = require('../models/Review');
const Route = require('../models/Route');
const User = require('../models/User');

const assertObjectId = (id, label) => {
    if (!mongoose.isValidObjectId(id)) {
        const err = new Error(`${label} is invalid`);
        err.statusCode = 400;
        throw err;
    }
};

const createReview = async (reviewData) => {
    const { route: routeId, user: userId } = reviewData;

    assertObjectId(routeId, 'route');
    assertObjectId(userId, 'user');

    const [route, user] = await Promise.all([
        Route.findById(routeId),
        User.findById(userId)
    ]);

    if (!route) {
        const err = new Error('Route not found');
        err.statusCode = 404;
        throw err;
    }
    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }

    try {
        return await Review.create(reviewData);
    } catch (error) {
        // Duplicate (route,user) review
        if (error && error.code === 11000) {
            const err = new Error('You already reviewed this route');
            err.statusCode = 409;
            throw err;
        }
        throw error;
    }
};

const getReviewsByRouteId = async (routeId) => {
    assertObjectId(routeId, 'routeId');

    const reviews = await Review.find({ route: routeId })
        .populate('user', 'name role cyclingStyle')
        .sort({ createdAt: -1 });

    const count = reviews.length;
    const safetyAvg = count
        ? reviews.reduce((sum, r) => sum + r.safetyRating, 0) / count
        : 0;
    const ecoAvg = count
        ? reviews.reduce((sum, r) => sum + r.ecoRating, 0) / count
        : 0;
    const overallAvg = count ? (safetyAvg + ecoAvg) / 2 : 0;

    return {
        reviews,
        count,
        averages: {
            safety: Number(safetyAvg.toFixed(2)),
            eco: Number(ecoAvg.toFixed(2)),
            overall: Number(overallAvg.toFixed(2))
        }
    };
};

const updateReview = async (id, updateData) => {
    assertObjectId(id, 'id');

    // Prevent changing ownership / relation via update endpoint
    const { route, user, ...allowed } = updateData || {};

    return await Review.findByIdAndUpdate(id, allowed, {
        new: true,
        runValidators: true
    });
};

const deleteReview = async (id) => {
    assertObjectId(id, 'id');
    return await Review.findByIdAndDelete(id);
};

module.exports = {
    createReview,
    getReviewsByRouteId,
    updateReview,
    deleteReview
};

