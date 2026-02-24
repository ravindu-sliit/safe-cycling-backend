const mongoose = require('mongoose');

const hazardReportSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 140,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        type: {
            type: String,
            enum: ['pothole', 'debris', 'lighting', 'collision', 'other'],
            default: 'other',
            required: true,
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        status: {
            type: String,
            enum: ['reported', 'pending', 'resolved'],
            default: 'reported',
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
                required: true,
            },
            coordinates: {
                type: [Number], // [lng, lat]
                required: true,
                validate: v => v.length === 2,
            },
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

hazardReportSchema.index({ location: '2dsphere' });
hazardReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('HazardReport', hazardReportSchema);