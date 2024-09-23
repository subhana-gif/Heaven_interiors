const express = require('express');
const router = express.Router();
const userController = require('../controllers/homeController');

// Home route and fetching categories/products
router.get('/home', userController.renderHomePage);
router.get('/categories', userController.fetchCategories);
router.get('/products', userController.fetchProducts);

module.exports = router;
    