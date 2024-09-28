const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/customers', customerController.renderCustomerPage);
router.post('/customers/toggle-status/:id', customerController.toggleUserStatus); 
module.exports = router;
