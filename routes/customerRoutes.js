const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Customer Management Routes
router.get('/customers', customerController.renderCustomerPage);
router.post('/customers/toggle-status/:id', customerController.toggleUserStatus); // This should handle POST requests for toggling status
module.exports = router;
