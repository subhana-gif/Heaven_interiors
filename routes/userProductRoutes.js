const express = require('express');
const router = express.Router();
const userProductController = require('../controllers/userProductController');

router.get('/shop', userProductController.renderUserProductPage);
router.get('/shop/:id', userProductController.viewProduct);
router.get('/product/:id', userProductController.viewProduct); 

module.exports = router;
