const hazardService = require('../services/HazardService');
const imageKitService = require('../services/imageKitService');

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

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
        const payload = { ...req.body };

        if ('solveResult' in payload) {
            payload.solveResult = normalizeText(payload.solveResult);
        }

        if (payload.status === 'resolved' && !payload.solveResult) {
            return res.status(400).json({ message: 'Solve result is required when marking a hazard as resolved.' });
        }

        if (payload.status && payload.status !== 'resolved') {
            payload.solveResult = '';
            payload.resolvedBy = null;
            payload.resolvedAt = null;
        }

        const updated = await hazardService.updateHazard(req.params.id, payload);
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

const resolveHazard = async (req, res, next) => {
    try {
        const solveResult = normalizeText(req.body.solveResult);
        const actorId = req.body.resolvedBy || req.body.updatedBy;

        if (!actorId) {
            return res.status(400).json({ message: 'A valid user is required to mark hazard as solved.' });
        }

        if (!solveResult) {
            return res.status(400).json({ message: 'Solve result is required to mark hazard as solved.' });
        }

        const updated = await hazardService.updateHazard(req.params.id, {
            status: 'resolved',
            solveResult,
            resolvedBy: actorId,
            updatedBy: actorId,
            resolvedAt: new Date(),
        });

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

const uploadHazardImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Image file is required' });
        }

        const uploadResult = await imageKitService.uploadHazardImage(req.file);
        res.status(201).json(uploadResult);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createHazard,
    getAllHazards,
    getHazardById,
    updateHazard,
    resolveHazard,
    deleteHazard,
    uploadHazardImage
};