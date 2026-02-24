const hazardService = require('../services/hazardService');

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

module.exports = {
    createHazard,
    getAllHazards,
    getHazardById,
    updateHazard,
    deleteHazard
};