const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// OTP routes
router.get('/otp_form', userController.renderOtpForm);
router.post('/verify_otp', userController.verifyOtp);
router.post('/resend_otp', userController.resendOtp);

// Home route
router.get('/home', userController.renderHomePage);

// Fetch categories and products
router.get('/categories', userController.fetchCategories);
router.get('/products', userController.fetchProducts);

// User login and signup routes
router.get('/user_login', userController.renderUserLogin);
router.get('/user_signup', userController.renderUserSignup);
router.post('/user_login', userController.handleUserLogin);
router.post('/user_signup', userController.handleUserSignup);

// Product-related routes
router.get('/products', userController.fetchProductsList);
router.get('/product/:id', userController.fetchProductDetails);

module.exports = router;
