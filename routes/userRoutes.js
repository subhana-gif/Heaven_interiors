const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/user_login', userController.renderUserLogin);
router.get('/user_signup', userController.renderUserSignup);
router.post('/user_login', userController.handleUserLogin);
router.post('/user_signup', userController.handleUserSignup);



module.exports = router;
