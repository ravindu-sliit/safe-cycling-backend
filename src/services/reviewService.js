const mongoose = require('mongoose');
const Review = require('../models/Review');
const Route = require('../models/Route');
const User = require('../models/User');
const assertCleanContent = require('../utils/moderator');

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

    //Check the comment for profanity before hitting the database.
    assertCleanContent(reviewData.comment, 'comment');

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
    const ratingAvg = count
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
        : 0;

    return {
        reviews,
        count,
        averages: {
            rating: Number(ratingAvg.toFixed(2))
        }
    };
};

const getAllReviews = async () => {
    const reviews = await Review.find()
        .populate('user', 'name email role cyclingStyle profileImageUrl')
        .populate('route', 'title distance ecoScore startLocation endLocation')
        .sort({ createdAt: -1 });

    const count = reviews.length;
    const ratingAvg = count
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / count
        : 0;

    return {
        reviews,
        count,
        averages: {
            rating: Number(ratingAvg.toFixed(2))
        }
    };
};

const updateReview = async (id, updateData) => {
    assertObjectId(id, 'id');

    // If the user is updating their comment, check it again!
    if (updateData.comment) {
        assertCleanContent(updateData.comment, 'comment');
    }

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

const likeReview = async (id) => {
    assertObjectId(id, 'id');
    return await Review.findByIdAndUpdate(
        id,
        { $inc: { likes: 1 } },
        { new: true, runValidators: true }
    );
};

module.exports = {
    createReview,
    getAllReviews,
    getReviewsByRouteId,
    updateReview,
    deleteReview,
    likeReview
};

