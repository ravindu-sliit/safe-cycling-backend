const hazardService = require('../services/hazardService');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIRECTORY = path.join(__dirname, '..', 'uploads');

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

const buildPublicUploadUrl = (req, filename) => `${req.protocol}://${req.get('host')}/uploads/${filename}`;

const createHazard = async (req, res, next) => {
    try{
        const report = await hazardService.createHazard(req.body);
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
        const updated = await hazardService.updateHazard(req.params.id, req.body);
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

const deleteHazard = async (req, res, next) => {
    try {
        const deleted = await hazardService.deleteHazard(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found' });
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

const uploadImage = async (req, res, next) => {
    try {
        if (!req.file?.buffer?.length) {
            return res.status(400).json({ success: false, message: 'Please choose an image to upload.' });
        }

        await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });

        const extension = getFileExtension(req.file);
        const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
        const absoluteFilePath = path.join(UPLOAD_DIRECTORY, filename);

        await fs.writeFile(absoluteFilePath, req.file.buffer);

        res.status(200).json({
            success: true,
            url: buildPublicUploadUrl(req, filename),
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
    uploadImage
};
