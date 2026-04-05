// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route for logging in
router.post('/login', authController.login);
router.get('/verify/:token', authController.verifyEmail);

router.post('/forgotpassword', authController.forgotPassword);
router.put('/resetpassword/:token', authController.resetPassword);

module.exports = router;