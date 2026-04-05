const express = require('express');
const router = express.Router();


const {
    createUser,
    getUser,
    updateUser,
    deleteUser,
    getUsers
} = require('../controllers/userController');

const { protect } = require('../middleware/authMiddleware');

router.post('/', createUser);           

router.get('/:id', protect, getUser);            
router.put('/:id', protect, updateUser);         
router.delete('/:id', protect, deleteUser);      
router.get('/',protect, getUsers);              

module.exports = router;