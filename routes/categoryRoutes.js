
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Category Management Routes
router.get('/category', categoryController.renderCategoryPage);
router.post('/category', categoryController.addCategory);
router.post('/category/edit/:id', categoryController.editCategory);
router.post('/category/delete/:id', categoryController.deleteCategory);
router.post('/category/bulk', categoryController.bulkUpdateCategories);

module.exports = router;
