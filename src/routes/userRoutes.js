const express = require('express');
const router = express.Router();


const {
    createUser,
    getUser,
    updateUser,
    uploadProfileImage,
    removeProfileImage,
    deleteUser,
    getUsers
} = require('../controllers/userController');

const { protect, optionalAuth, authorize } = require('../middleware/authMiddleware');
const { createMultipartImageParser } = require('../middleware/imageUploadMiddleware');

const parseProfileImageUpload = createMultipartImageParser({
    fileFieldName: 'profileImage',
    fileFieldNames: ['image', 'avatar', 'photo'],
    requireFile: true,
});

// POST / -> Public signup, but admins may also use it to create privileged accounts
router.post('/', optionalAuth, createUser);           

// GET / -> Admin only
router.get('/', protect, authorize('admin'), getUsers);

// GET /:id -> Any logged-in user
router.get('/:id', protect, getUser);            

// PUT /:id -> Any logged-in user
router.put('/:id', protect, updateUser);         

// POST /:id/profile-image -> Current user or admin
router.post('/:id/profile-image', protect, parseProfileImageUpload, uploadProfileImage);

// DELETE /:id/profile-image -> Current user or admin
router.delete('/:id/profile-image', protect, removeProfileImage);

// DELETE /:id -> Current user or admin
router.delete('/:id', protect, deleteUser);      

module.exports = router;
