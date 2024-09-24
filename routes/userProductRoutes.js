const express = require('express');
const router = express.Router();
const userProductController = require('../controllers/userProductController');

// Route to display all products
router.get('/shop', userProductController.renderUserProductPage);

// Route to view a specific product
router.get('/shop/:id', userProductController.viewProduct);
router.get('/product/:id', userProductController.getProductDetails); 

module.exports = router;
