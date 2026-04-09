const hazardService = require('../services/hazardService');
const path = require('path');
const crypto = require('crypto');
const ImageKit = require('@imagekit/nodejs');
const { toFile } = require('@imagekit/nodejs');

const IMAGEKIT_UPLOAD_FOLDER = process.env.IMAGEKIT_UPLOAD_FOLDER || '/safe-cycling/hazards';
const EARTH_RADIUS_METERS = 6371000;
const COMMUNITY_UPDATE_MAX_DISTANCE_METERS = 30;

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

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const getDistanceInMeters = (first, second) => {
    const latitudeDelta = toRadians(Number(second.latitude) - Number(first.latitude));
    const longitudeDelta = toRadians(Number(second.longitude) - Number(first.longitude));
    const firstLatitude = toRadians(Number(first.latitude));
    const secondLatitude = toRadians(Number(second.latitude));

    const haversineFactor = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;

    const angularDistance = 2 * Math.atan2(Math.sqrt(haversineFactor), Math.sqrt(1 - haversineFactor));
    return EARTH_RADIUS_METERS * angularDistance;
};

const ALLOWED_HAZARD_STATUSES = new Set(['reported', 'pending', 'resolved']);

const getEntityId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;

    if (typeof value?.toHexString === 'function') {
        return value.toHexString();
    }

    if (value?._id) {
        return getEntityId(value._id);
    }

    if (typeof value?.id === 'string') {
        return value.id;
    }

    if (typeof value?.toString === 'function') {
        const stringValue = value.toString();
        if (typeof stringValue === 'string' && /^[a-f0-9]{24}$/i.test(stringValue)) {
            return stringValue;
        }
    }

    return '';
};

const getStatusUpdatesNewestFirst = (hazard) => {
    const updates = Array.isArray(hazard?.statusUpdates) ? hazard.statusUpdates : [];

    return updates
        .slice()
        .sort((left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime());
};

const canManageCommunityUpdate = ({ requesterId, requesterRole, hazardCreatorId, updateOwnerId }) => {
    if (requesterRole === 'admin') return true;
    if (!requesterId) return false;
    if (requesterId === hazardCreatorId) return true;
    return requesterId === updateOwnerId;
};

const syncHazardSnapshotFromLatestUpdate = (hazard) => {
    const updates = getStatusUpdatesNewestFirst(hazard);
    const latestUpdate = updates[0] || null;

    if (!latestUpdate) {
        if (!hazard.imageUrl && typeof hazard.initialImageUrl === 'string') {
            hazard.imageUrl = hazard.initialImageUrl.trim();
        }

        if (!ALLOWED_HAZARD_STATUSES.has(String(hazard.status || '').toLowerCase().trim())) {
            hazard.status = 'reported';
        }
        return;
    }

    const latestStatus = String(latestUpdate?.status || '').toLowerCase().trim();
    const latestImageUrl = String(latestUpdate?.imageUrl || '').trim();

    if (ALLOWED_HAZARD_STATUSES.has(latestStatus)) {
        hazard.status = latestStatus;
    }

    if (latestImageUrl) {
        hazard.imageUrl = latestImageUrl;
    }
};

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

            const measuredDistanceFromHazard = getDistanceInMeters(updateLocation, hazardLocation);

            if (measuredDistanceFromHazard > COMMUNITY_UPDATE_MAX_DISTANCE_METERS) {
                return res.status(403).json({
                    message: `You can post this update only when you are near the hazard location (within ${COMMUNITY_UPDATE_MAX_DISTANCE_METERS} meters). Measured distance: ${measuredDistanceFromHazard.toFixed(1)}m.`,
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

            const requestedStatus = String(req.body?.status || existingHazard?.status || 'reported').toLowerCase().trim();
            if (!ALLOWED_HAZARD_STATUSES.has(requestedStatus)) {
                return res.status(400).json({
                    message: 'Hazard status must be one of reported, pending, or resolved.',
                });
            }

            const updateEntry = {
                user: req.user?._id,
                comment,
                imageUrl: updateImageUrl,
                status: requestedStatus,
                createdAt: new Date(),
            };

            const updatedHazard = await hazardService.addCommunityUpdate(
                req.params.id,
                updateEntry,
                updateImageUrl,
                requestedStatus
            );
            return res.json(updatedHazard);
        }

        const updated = await hazardService.updateHazard(req.params.id, req.body);
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

const updateCommunityHazardUpdate = async (req, res, next) => {
    try {
        const hazard = await hazardService.getHazardByIdForWrite(req.params.id);
        if (!hazard) {
            return res.status(404).json({ message: 'Not found' });
        }

        const updateEntry = hazard.statusUpdates?.id?.(req.params.updateId);
        if (!updateEntry) {
            return res.status(404).json({ message: 'Hazard update entry was not found.' });
        }

        const requesterId = getEntityId(req.user?._id);
        const requesterRole = String(req.user?.role || '').toLowerCase();
        const hazardCreatorId = getEntityId(hazard?.createdBy);
        const updateOwnerId = getEntityId(updateEntry?.user);

        if (!canManageCommunityUpdate({ requesterId, requesterRole, hazardCreatorId, updateOwnerId })) {
            return res.status(403).json({ message: 'You can edit only your own hazard update entries.' });
        }

        const nextComment = Object.prototype.hasOwnProperty.call(req.body || {}, 'comment')
            ? String(req.body.comment || '').trim()
            : String(updateEntry.comment || '').trim();

        if (!nextComment) {
            return res.status(400).json({ message: 'Please add a comment about the current hazard situation.' });
        }

        const nextStatus = Object.prototype.hasOwnProperty.call(req.body || {}, 'status')
            ? String(req.body.status || '').toLowerCase().trim()
            : String(updateEntry.status || hazard.status || 'reported').toLowerCase().trim();

        if (!ALLOWED_HAZARD_STATUSES.has(nextStatus)) {
            return res.status(400).json({
                message: 'Hazard status must be one of reported, pending, or resolved.',
            });
        }

        const nextImageUrl = Object.prototype.hasOwnProperty.call(req.body || {}, 'imageUrl')
            ? String(req.body.imageUrl || '').trim()
            : String(updateEntry.imageUrl || '').trim();

        if (!nextImageUrl) {
            return res.status(400).json({ message: 'Please upload the current hazard image before saving this update.' });
        }

        updateEntry.comment = nextComment;
        updateEntry.status = nextStatus;
        updateEntry.imageUrl = nextImageUrl;

        syncHazardSnapshotFromLatestUpdate(hazard);

        await hazard.save();

        const refreshedHazard = await hazardService.getHazardById(req.params.id);
        return res.json(refreshedHazard);
    } catch (err) {
        next(err);
    }
};

const deleteCommunityHazardUpdate = async (req, res, next) => {
    try {
        const hazard = await hazardService.getHazardByIdForWrite(req.params.id);
        if (!hazard) {
            return res.status(404).json({ message: 'Not found' });
        }

        const updateEntry = hazard.statusUpdates?.id?.(req.params.updateId);
        if (!updateEntry) {
            return res.status(404).json({ message: 'Hazard update entry was not found.' });
        }

        const requesterId = getEntityId(req.user?._id);
        const requesterRole = String(req.user?.role || '').toLowerCase();
        const hazardCreatorId = getEntityId(hazard?.createdBy);
        const updateOwnerId = getEntityId(updateEntry?.user);

        if (!canManageCommunityUpdate({ requesterId, requesterRole, hazardCreatorId, updateOwnerId })) {
            return res.status(403).json({ message: 'You can delete only your own hazard update entries.' });
        }

        if (typeof hazard.statusUpdates?.pull === 'function') {
            hazard.statusUpdates.pull(updateEntry._id);
        } else {
            hazard.statusUpdates = (Array.isArray(hazard.statusUpdates) ? hazard.statusUpdates : []).filter(
                (entry) => getEntityId(entry?._id) !== getEntityId(updateEntry?._id)
            );
        }

        syncHazardSnapshotFromLatestUpdate(hazard);

        await hazard.save();

        const refreshedHazard = await hazardService.getHazardById(req.params.id);
        return res.json(refreshedHazard);
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
    updateCommunityHazardUpdate,
    deleteCommunityHazardUpdate,
    deleteHazard,
    toggleLikeHazard,
    uploadImage
};
