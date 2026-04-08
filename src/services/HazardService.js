const HazardReport = require('../models/HazardReport');

const HAZARD_POPULATE = [
    { path: 'createdBy', select: 'name email role' },
    { path: 'statusUpdates.user', select: 'name email role' },
];

const createHazard = async (data) => {
    const report = new HazardReport(data);
    return await report.save();
};

const getAllHazards = async () => {
    return await HazardReport.find()
        .populate(HAZARD_POPULATE)
        .sort({ createdAt: -1 });
};

const getHazardById = async (id) => {
    return await HazardReport.findById(id)
        .populate(HAZARD_POPULATE);
};

const updateHazard = async (id, data) => {
    return await HazardReport.findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .populate(HAZARD_POPULATE);
};

const addCommunityUpdate = async (id, updateEntry, latestImageUrl = '') => {
    const updateCommand = {
        $push: {
            statusUpdates: {
                $each: [updateEntry],
                $position: 0,
            },
        },
    };

    if (typeof latestImageUrl === 'string' && latestImageUrl.trim()) {
        updateCommand.$set = { imageUrl: latestImageUrl.trim() };
    }

    return await HazardReport.findByIdAndUpdate(id, updateCommand, { new: true, runValidators: true })
        .populate(HAZARD_POPULATE);
};

const toggleLike = async (id, userId) => {
    if (!userId) {
        return null;
    }

    const updated = await HazardReport.findByIdAndUpdate(
        id,
        { $addToSet: { likedBy: userId } },
        { new: true, runValidators: true }
    ).populate(HAZARD_POPULATE);

    return updated;
};

const deleteHazard = async (id) => {
    return await HazardReport.findByIdAndDelete(id);
};

module.exports = {
    createHazard,
    getAllHazards,
    getHazardById,
    updateHazard,
    addCommunityUpdate,
    toggleLike,
    deleteHazard,
};
