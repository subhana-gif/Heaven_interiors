const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController'); 
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 

router.get('/profile', isAuthenticated,checkUserBlocked, profileController.renderProfile);
router.get('/profile/personal-info', isAuthenticated,checkUserBlocked, profileController.getPersonalInfo);
router.get('/profile/address-management', isAuthenticated,checkUserBlocked, profileController.getAddressManagement);
router.post('/profile/update-info', isAuthenticated,checkUserBlocked, profileController.updatePersonalInfo);
router.post('/profile/add-address', isAuthenticated, checkUserBlocked, profileController.addAddress);
router.get('/profile/address/:id', isAuthenticated, checkUserBlocked, profileController.getAddress);
router.put('/profile/:addressId/edit-address', isAuthenticated, checkUserBlocked, profileController.editAddress);
router.delete('/profile/address/delete/:addressId', isAuthenticated, checkUserBlocked, profileController.deleteAddress);

module.exports = router;
