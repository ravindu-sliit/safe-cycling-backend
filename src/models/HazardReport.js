const mongoose = require('mongoose');

const hazardStatusUpdateSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        comment: {
            type: String,
            trim: true,
            required: true,
            maxlength: 1200,
        },
        imageUrl: {
            type: String,
            trim: true,
            default: '',
        },
        status: {
            type: String,
            enum: ['reported', 'pending', 'resolved'],
            default: 'reported',
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

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
        imageUrl: {
            type: String,
            trim: true,
            default: '',
        },
        initialImageUrl: {
            type: String,
            trim: true,
            default: '',
        },
        type: {
            type: String,
            enum: [
                'pothole',
                'debris',
                'construction-zone',
                'roadside-hazard',
                'collision',
                'grounding',
                'runway-safety',
                'rain',
                'fog',
                'snow',
                'black-ice',
                'wildlife',
                'equipment-malfunction',
                'infrastructure-failure',
                'lighting',
                'flooding',
                'fallen-tree',
                'road-closure',
                'oil-spill',
                'other',
            ],
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
        locationName: {
            type: String,
            trim: true,
            default: '',
            maxlength: 240,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        likedBy: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
            ],
            default: [],
        },
        statusUpdates: {
            type: [hazardStatusUpdateSchema],
            default: [],
        },
    },
    { timestamps: true }
);

hazardReportSchema.index({ location: '2dsphere' });
hazardReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('HazardReport', hazardReportSchema);