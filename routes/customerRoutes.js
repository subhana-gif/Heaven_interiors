const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const {isAdminAuthenticated}=require('../middleware/authMiddleware')

router.get('/customers',isAdminAuthenticated,customerController.renderCustomerPage);
router.post('/customers/toggle-status/:id', isAdminAuthenticated,customerController.toggleUserStatus); 
module.exports = router;
