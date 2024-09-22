const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Orders Route
router.get('/orders', (req, res) => {
    res.render('adminPanel', { body: 'admin/orders' });
});
module.exports = router;
