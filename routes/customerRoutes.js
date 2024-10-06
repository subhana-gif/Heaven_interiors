const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware=require('../middleware/authMiddleware')
const noCache = require('../middleware/noCacheMiddleware');

router.get('/customers',  authMiddleware.isAdminAuthenticated,noCache,customerController.renderCustomerPage);
router.post('/customers/toggle-status/:id', customerController.toggleUserStatus); 
module.exports = router;
