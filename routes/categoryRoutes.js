
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const {isAdminAuthenticated}=require('../middleware/authMiddleware')

router.get('/category',isAdminAuthenticated,categoryController.renderCategoryPage);
router.post('/category/add',isAdminAuthenticated,categoryController.addCategory);
router.post('/category/edit/:id',isAdminAuthenticated,categoryController.editCategory);
router.post('/category/toggle-status/:id',isAdminAuthenticated,categoryController.toggleCategoryStatus);

module.exports = router;
