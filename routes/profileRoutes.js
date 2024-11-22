const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController'); 
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 

router.get('/profile', isAuthenticated,checkUserBlocked, profileController.renderProfile);
router.get('/profile/personal-info', isAuthenticated,checkUserBlocked, profileController.getPersonalInfo);
router.get('/profile/address-management', isAuthenticated,checkUserBlocked, profileController.getAddressManagement);

module.exports = router;
