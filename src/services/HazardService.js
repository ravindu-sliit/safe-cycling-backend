const HazardReport = require('../models/HazardReport');

const createHazard = async (data) => {
    const report = new HazardReport(data);
    return await report.save();
};

const getAllHazards = async () => {
    return await HazardReport.find();
};

const getHazardById = async (id) => {
    return await HazardReport.findById(id);
};

const updateHazard = async (id, data) => {
    return await HazardReport.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

const deleteHazard = async (id) => {
    return await HazardReport.findByIdAndDelete(id);
};

module.exports = {
    createHazard,
    getAllHazards,
    getHazardById,
    updateHazard,
    deleteHazard,
};