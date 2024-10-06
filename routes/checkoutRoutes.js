const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 


router.get('/checkout',isAuthenticated,checkUserBlocked,checkoutController.getCheckoutPage);
router.post('/checkout/addresses/add',isAuthenticated,checkUserBlocked,checkoutController.addAddress);
router.post('/checkout/addresses/edit/:id', isAuthenticated,checkUserBlocked, checkoutController.editAddress);
router.post('/checkout/addresses/delete/:id', isAuthenticated, checkUserBlocked,checkoutController.deleteAddress);
router.post('/checkout/placeOrder', isAuthenticated,checkUserBlocked,checkoutController.placeOrder)


module.exports = router;
