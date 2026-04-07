const HazardReport = require('../models/HazardReport');

const USER_SELECT = 'name email role';

const applyHazardPopulate = (query) => (
    query
        .populate('createdBy', USER_SELECT)
        .populate('updatedBy', USER_SELECT)
        .populate('resolvedBy', USER_SELECT)
);

const createHazard = async (data) => {
    const report = new HazardReport(data);
    const created = await report.save();
    return await getHazardById(created._id);
};

const getAllHazards = async () => {
    return await applyHazardPopulate(HazardReport.find());
};

const getHazardById = async (id) => {
    return await applyHazardPopulate(HazardReport.findById(id));
};

const updateHazard = async (id, data) => {
    return await applyHazardPopulate(
        HazardReport.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    );
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