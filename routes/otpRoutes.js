const express = require('express');
const router = express.Router();
const userController = require('../controllers/otpController');

// OTP-related routes
router.get('/otp_form', userController.renderOtpForm);
router.post('/verify_otp', userController.verifyOtp);
router.post('/resend_otp', userController.resendOtp);

module.exports = router;
