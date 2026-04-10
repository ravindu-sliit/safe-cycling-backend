const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
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
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        difficulty: {
            type: String,
            enum: ['Easy', 'Medium', 'Hard'],
            required: true
        },
        upvotes: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        }],
        downvotes: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        }],
        distance: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { timestamps: true }
);

// One review per user per route
reviewSchema.index({ route: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
