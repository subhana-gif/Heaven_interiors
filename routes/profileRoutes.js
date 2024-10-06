const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController'); 
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 

router.get('/profile',isAuthenticated,checkUserBlocked, profileController.getProfilePage);
router.get('/personal-information', isAuthenticated,checkUserBlocked,profileController.getPersonalInformation);
router.post('/update-profile', isAuthenticated,checkUserBlocked,profileController.updateProfile);
router.post('/update-password', isAuthenticated,checkUserBlocked,profileController.updatePassword);
router.get('/addresses',isAuthenticated,checkUserBlocked, profileController.getUserAddresses);
router.post('/add-address',isAuthenticated,checkUserBlocked, profileController.addNewAddress);
router.get('/addresses/:id/edit', isAuthenticated,checkUserBlocked,profileController.getEditAddress);
router.post('/addresses/:id/edit',isAuthenticated,checkUserBlocked, profileController.updateAddress);
router.delete('/addresses/:id', isAuthenticated,checkUserBlocked,profileController.deleteAddress);

module.exports = router;
