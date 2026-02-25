const express = require('express');
const router = express.Router();

// Import the controller functions you just wrote
const {
    createUser,
    getUser,
    updateUser,
    deleteUser,
    getUsers
} = require('../controllers/userController');

// Map the endpoints to the specific controller functions
router.post('/', createUser);           // POST /api/users
router.get('/:id', getUser);            // GET /api/users/:id
router.put('/:id', updateUser);         // PUT /api/users/:id
router.delete('/:id', deleteUser);      // DELETE /api/users/:id
router.get('/', getUsers);              // GET /api/users

module.exports = router;