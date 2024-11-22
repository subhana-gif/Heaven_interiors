const express = require('express');
const router = express.Router();
const {redirectIfAuthenticated} = require('../middleware/authUserMiddleware')
const userController = require('../controllers/userController');

router.get('/user_login',redirectIfAuthenticated,userController.renderUserLogin);
router.get('/user_signup', userController.renderUserSignup);
router.post('/user_login', userController.handleUserLogin);
router.post('/user_signup', userController.handleUserSignup);
router.get('/logout', userController.handleUserLogout);
router.get('/forgot_password', userController.renderForgotPassword);
router.post('/forgot_password', userController.handleForgotPassword);
router.get('/reset_password/:token', userController.renderResetPassword);
router.post('/reset_password/:token', userController.handleResetPassword);

module.exports = router;
