const express = require('express');
const router = express.Router();
const userProductController = require('../controllers/userProductController');
const {checkUserBlocked } = require('../middleware/authUserMiddleware'); 

router.get('/shop',checkUserBlocked, userProductController.renderUserProductPage);
router.get('/shop/:id',checkUserBlocked, userProductController.viewProduct);
router.get('/product/:id',checkUserBlocked, userProductController.viewProduct); 

module.exports = router;
