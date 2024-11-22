const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const couponController = require('../controllers/couponController')
const walletController = require('../controllers/walletController')
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 


router.get('/checkout',isAuthenticated,checkUserBlocked,checkoutController.getCheckoutPage);
router.post('/checkout/createOrder',isAuthenticated,checkUserBlocked,checkoutController.createOrder);
router.post('/checkout/placeOrder',isAuthenticated,checkUserBlocked,checkoutController.placeOrder);
router.post('/checkout/addresses/add',isAuthenticated,checkUserBlocked,checkoutController.addAddress);
router.post('/checkout/addresses/edit/:id',isAuthenticated,checkUserBlocked,checkoutController.editAddress);
router.post('/checkout/addresses/delete/:id',isAuthenticated,checkUserBlocked,checkoutController.deleteAddress);
router.post('/checkout/applyCoupon',isAuthenticated,checkUserBlocked,couponController.applyCoupon);
router.post('/checkout/removeCoupon',isAuthenticated,checkUserBlocked,couponController.removeCoupon);
router.post('/checkout/applyWallet',isAuthenticated,checkUserBlocked,walletController.applyWallet);
router.get('/checkout/getDeliveryCharge/:addressId',isAuthenticated,checkUserBlocked,checkoutController.getDeliveryCharge);
router.post('/checkout/placeOrderPending',isAuthenticated,checkUserBlocked,checkoutController.placeOrderPending)


module.exports = router;
