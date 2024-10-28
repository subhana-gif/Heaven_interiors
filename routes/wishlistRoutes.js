const express = require('express');
const router = express.Router();
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 
const wishlistController = require('../controllers/wishlistController');

router.post('/wishlist/add/:id',isAuthenticated,checkUserBlocked,wishlistController.addToWishlist);
router.delete('/wishlist/remove/:productId', isAuthenticated,checkUserBlocked,wishlistController.removeFromWishlist);
router.get('/wishlist',isAuthenticated,checkUserBlocked,wishlistController.getWishlist);
router.post('/wishlist/toggle/:productId', isAuthenticated,checkUserBlocked, wishlistController.toggleWishlist);

module.exports = router;
