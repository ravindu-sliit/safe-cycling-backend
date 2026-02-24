const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        reviewId: {
            type: String,
            unique: true
        },
        route: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Route',
            required: true,
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        safetyRating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        ecoRating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 1000
        }
    },
    { timestamps: true }
);

// One review per user per route (common for community rating systems)
reviewSchema.index({ route: 1, user: 1 }, { unique: true });

// Ensure reviewId is always set to the underlying MongoDB _id as a string
reviewSchema.pre('save', function (next) {
    if (!this.reviewId) {
        this.reviewId = this._id.toString();
    }
    next();
});

module.exports = mongoose.model('Review', reviewSchema);
