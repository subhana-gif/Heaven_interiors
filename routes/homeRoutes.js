const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Home route and fetching categories/products
router.get('/home', homeController.renderHomePage);
router.get('/categories', homeController.fetchCategories);
router.get('/products', homeController.fetchProducts);

module.exports = router;
    