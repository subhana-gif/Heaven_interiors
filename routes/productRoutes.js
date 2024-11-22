const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/uploadMiddleware'); 
const { isAdminAuthenticated } = require('../middleware/authMiddleware');

router.get('/products',isAdminAuthenticated,productController.renderProductPage);
router.post('/products/add',isAdminAuthenticated,upload.array('images', 3), productController.addProduct);
router.post('/products/edit/:id',isAdminAuthenticated,upload.array('images', 3), productController.editProduct);
router.get('/products/view/:id',isAdminAuthenticated,productController.viewProduct);
router.post('/products/toggle-status/:id',isAdminAuthenticated,productController.toggleProductStatus);
router.post('/upload', upload.single('image'),isAdminAuthenticated,productController.uploadImage);
router.post('/products/specifications/:id',isAdminAuthenticated,productController.updateSpecifications);

module.exports = router;
