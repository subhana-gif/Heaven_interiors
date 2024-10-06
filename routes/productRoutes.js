const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/uploadMiddleware'); 
const authMiddleware=require('../middleware/authMiddleware')
const nocache=require('../middleware/noCacheMiddleware')



router.get('/products', authMiddleware.isAdminAuthenticated,nocache,productController.renderProductPage);
router.post('/products/add', upload.array('images', 3), productController.addProduct);
router.post('/products/edit/:id', upload.array('images', 3), productController.editProduct);
router.get('/products/view/:id', productController.viewProduct);
router.post('/products/toggle-status/:id', productController.toggleProductStatus);
router.post('/upload', upload.single('image'), productController.uploadImage);
router.post('/products/specifications/:id', productController.updateSpecifications);

module.exports = router;
