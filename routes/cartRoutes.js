const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 

router.post('/add-to-cart/:id', isAuthenticated, checkUserBlocked,cartController.addToCart);
router.post('/update-cart/:id', isAuthenticated, checkUserBlocked,cartController.updateCart);
router.post('/remove-from-cart/:id', isAuthenticated, checkUserBlocked, cartController.removeFromCart);
router.get('/cart', isAuthenticated, checkUserBlocked, cartController.renderCart);

module.exports = router;
