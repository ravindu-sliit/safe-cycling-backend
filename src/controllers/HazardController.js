const hazardService = require('../services/hazardService');
const path = require('path');
const crypto = require('crypto');
const ImageKit = require('@imagekit/nodejs');
const { toFile } = require('@imagekit/nodejs');

const COORDINATE_PRECISION = 6;
const IMAGEKIT_UPLOAD_FOLDER = process.env.IMAGEKIT_UPLOAD_FOLDER || '/safe-cycling/hazards';

const MIME_EXTENSION_MAP = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
};

const getFileExtension = (file) => {
    const mimetypeExtension = MIME_EXTENSION_MAP[file.mimetype];
    if (mimetypeExtension) {
        return mimetypeExtension;
    }

    const originalExtension = path.extname(file.originalname || '').replace('.', '').trim().toLowerCase();
    return originalExtension || 'bin';
};

let imageKitClient;

const getImageKitClient = () => {
    if (imageKitClient) {
        return imageKitClient;
    }

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) {
        return null;
    }

    imageKitClient = new ImageKit({ privateKey });
    return imageKitClient;
};

const extractCoordinatePair = (location) => {
    const coordinates = location?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return null;
    }

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return null;
    }

    return { latitude, longitude };
};

const normalizeCoordinate = (value) => Number(Number(value).toFixed(COORDINATE_PRECISION));

const isSameCoordinatePair = (first, second) => (
    normalizeCoordinate(first.latitude) === normalizeCoordinate(second.latitude)
    && normalizeCoordinate(first.longitude) === normalizeCoordinate(second.longitude)
);

const createHazard = async (req, res, next) => {
    try{
        const userLocation = extractCoordinatePair(req.body?.location);
        if (!userLocation) {
            return res.status(400).json({
                message: 'Location access is required. Please turn on location services and try again.',
            });
        }

        const payload = {
            ...req.body,
            createdBy: req.user?._id,
            initialImageUrl: typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '',
            location: {
                type: 'Point',
                coordinates: [userLocation.longitude, userLocation.latitude],
            },
        };

        const report = await hazardService.createHazard(payload);
        res.status(201).json(report);
    }
    catch (err) {
        next(err);
    }
};

const getAllHazards = async (req, res, next) => {
    try {
        const reports = await hazardService.getAllHazards();
        res.json(reports);
    } catch (err) {
        next(err);
    }
};

const getHazardById = async (req, res, next) => {
    try {
        const report = await hazardService.getHazardById(req.params.id);
        if (!report) return res.status(404).json({ message: 'Not found' });
        res.json(report);
    } catch (err) {
        next(err);
    }
};

const updateHazard = async (req, res, next) => {
    try {
        const existingHazard = await hazardService.getHazardById(req.params.id);
        if (!existingHazard) return res.status(404).json({ message: 'Not found' });

        const requesterId = req.user?._id?.toString() || '';
        const creatorId = existingHazard?.createdBy?._id?.toString?.() || existingHazard?.createdBy?.toString?.() || '';

        if (req.user?.role === 'user') {
            if (requesterId && creatorId && requesterId === creatorId) {
                const ownerEditableFields = ['title', 'description', 'type', 'severity', 'status', 'locationName', 'location', 'imageUrl'];
                const ownerUpdatePayload = ownerEditableFields.reduce((accumulator, fieldName) => {
                    if (Object.prototype.hasOwnProperty.call(req.body || {}, fieldName)) {
                        accumulator[fieldName] = req.body[fieldName];
                    }
                    return accumulator;
                }, {});

                if (ownerUpdatePayload.location) {
                    const validLocation = extractCoordinatePair(ownerUpdatePayload.location);
                    if (!validLocation) {
                        return res.status(400).json({ message: 'Valid hazard location is required for this update.' });
                    }

                    ownerUpdatePayload.location = {
                        type: 'Point',
                        coordinates: [validLocation.longitude, validLocation.latitude],
                    };
                }

                if (typeof ownerUpdatePayload.imageUrl === 'string') {
                    ownerUpdatePayload.imageUrl = ownerUpdatePayload.imageUrl.trim();
                }

                if (Object.keys(ownerUpdatePayload).length === 0) {
                    return res.status(400).json({ message: 'No editable hazard fields were provided.' });
                }

                const updatedOwnerHazard = await hazardService.updateHazard(req.params.id, ownerUpdatePayload);
                return res.json(updatedOwnerHazard);
            }

            const updateLocation = extractCoordinatePair(req.body?.location);
            if (!updateLocation) {
                return res.status(400).json({
                    message: 'Location access is required to post a community update. Please turn on location services.',
                });
            }

            const hazardLocation = extractCoordinatePair(existingHazard?.location);
            if (!hazardLocation) {
                return res.status(400).json({ message: 'Hazard location is unavailable for validation.' });
            }

            if (!isSameCoordinatePair(updateLocation, hazardLocation)) {
                return res.status(403).json({
                    message: 'You can post this update only when your longitude and latitude match the hazard location.',
                });
            }

            const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
            if (!comment) {
                return res.status(400).json({ message: 'Please add a comment about the current hazard situation.' });
            }

            const updateImageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
            if (!updateImageUrl) {
                return res.status(400).json({ message: 'Please upload the current hazard image before posting your update.' });
            }

            const updateEntry = {
                user: req.user?._id,
                comment,
                imageUrl: updateImageUrl,
                createdAt: new Date(),
            };

            const updatedHazard = await hazardService.addCommunityUpdate(req.params.id, updateEntry, updateImageUrl);
            return res.json(updatedHazard);
        }

        const updated = await hazardService.updateHazard(req.params.id, req.body);
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

const deleteHazard = async (req, res, next) => {
    try {
        const existingHazard = await hazardService.getHazardById(req.params.id);
        if (!existingHazard) return res.status(404).json({ message: 'Not found' });

        const requesterId = req.user?._id?.toString() || '';
        const creatorId = existingHazard?.createdBy?._id?.toString?.() || existingHazard?.createdBy?.toString?.() || '';
        const isAdmin = req.user?.role === 'admin';

        if (!isAdmin && (!requesterId || !creatorId || requesterId !== creatorId)) {
            return res.status(403).json({ message: 'You can delete only your own hazard reports.' });
        }

        const deleted = await hazardService.deleteHazard(req.params.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

const toggleLikeHazard = async (req, res, next) => {
    try {
        const updatedHazard = await hazardService.toggleLike(req.params.id, req.user?._id);
        if (!updatedHazard) return res.status(404).json({ message: 'Not found' });
        res.json(updatedHazard);
    } catch (err) {
        next(err);
    }
};

const uploadImage = async (req, res, next) => {
    try {
        if (!req.file?.buffer?.length) {
            return res.status(400).json({ success: false, message: 'Please choose an image to upload.' });
        }

        const imageKit = getImageKitClient();
        if (!imageKit) {
            return res.status(500).json({
                success: false,
                message: 'ImageKit is not configured on the server. Set IMAGEKIT_PRIVATE_KEY in backend .env.',
            });
        }

        const extension = getFileExtension(req.file);
        const filename = `hazard-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;

        const uploadFile = await toFile(req.file.buffer, req.file.originalname || filename);
        const uploadResponse = await imageKit.files.upload({
            file: uploadFile,
            fileName: filename,
            folder: IMAGEKIT_UPLOAD_FOLDER,
            useUniqueFileName: true,
            tags: ['safe-cycling', 'hazard'],
        });

        res.status(200).json({
            success: true,
            url: uploadResponse?.url || '',
            fileId: uploadResponse?.fileId || '',
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createHazard,
    getAllHazards,
    getHazardById,
    updateHazard,
    deleteHazard,
    toggleLikeHazard,
    uploadImage
};
