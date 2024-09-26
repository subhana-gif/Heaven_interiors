const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/uploadMiddleware'); // Middleware for handling file uploads
const Product = require('../models/productModal'); // Adjust path as necessary
const Category = require('../models/category'); // Adjust path as necessary

router.get('/products', productController.renderProductPage);
router.post('/products/add', upload, productController.addProduct);
router.post('/products/edit/:id', upload, productController.editProduct);
router.get('/products/view/:id', productController.viewProduct);
router.post('/products/toggle-status/:id', productController.toggleProductStatus);
router.post('/upload', upload, productController.uploadImage);
router.post('/products/specifications/:id', productController.updateSpecifications);

module.exports = router;
