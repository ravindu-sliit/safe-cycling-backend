const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    startLocation: {
        type: String, // Can be updated to GeoJSON coordinates later if needed
        required: true
    },
    endLocation: {
        type: String,
        required: true
    },
    distance: {
        type: Number, // In kilometers
        required: true
    },
    ecoScore: {
        type: Number,
        required: true,
        min: 1,
        max: 10 // e.g., 10 is the most eco-friendly
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Route', routeSchema);