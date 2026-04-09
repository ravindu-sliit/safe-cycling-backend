// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Route for logging in
router.post('/login', authController.login);
router.post('/verify-2fa', authController.verifyTwoFactor);
router.post('/resend-2fa', authController.resendTwoFactor);
router.get('/verify/:token', authController.verifyEmail);

router.post('/forgotpassword', authController.forgotPassword);
router.post('/resend-verification', authController.resendVerification);
router.patch('/change-password', protect, authController.changePassword);
router.get('/resetpassword/:token', authController.redirectToResetPasswordPage);
router.put('/resetpassword/:token', authController.resetPassword);

module.exports = router;
