
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware=require('../middleware/authMiddleware')
const noCache = require('../middleware/noCacheMiddleware');

router.get('/category', authMiddleware.isAdminAuthenticated,noCache,categoryController.renderCategoryPage);
router.post('/category/add', categoryController.addCategory);
router.post('/category/edit/:id', categoryController.editCategory);
router.post('/category/toggle-status/:id', categoryController.toggleCategoryStatus);

module.exports = router;
