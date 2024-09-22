const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Customer Management Routes
router.get('/customers',customerController.renderCustomerPage);
module.exports = router;
