const express = require('express');
const router = express.Router();


const {
    createUser,
    getUser,
    updateUser,
    deleteUser,
    getUsers
} = require('../controllers/userController');

const { protect, authorize } = require('../middleware/authMiddleware');

// POST / -> Public
router.post('/', createUser);           

// GET / -> Admin only
router.get('/', protect, authorize('admin'), getUsers);

// GET /:id -> Any logged-in user
router.get('/:id', protect, getUser);            

// PUT /:id -> Any logged-in user
router.put('/:id', protect, updateUser);         

// DELETE /:id -> Admin only
router.delete('/:id', protect, authorize('admin'), deleteUser);      

module.exports = router;