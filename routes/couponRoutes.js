const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const {isAdminAuthenticated}=require('../middleware/authMiddleware')
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 

router.get('/coupons',isAdminAuthenticated,couponController.getAllCoupons);
router.post('/coupons/add',isAdminAuthenticated,couponController.addCoupon);
router.post('/coupons/edit/:id',isAdminAuthenticated,couponController.editCoupon);
router.post('/coupons/delete/:id',isAdminAuthenticated,couponController.softDeleteCoupon);
router.post('/coupons/restore/:id',isAdminAuthenticated,couponController.restoreCoupon);
router.post('/checkout/applyCoupon', isAuthenticated,checkUserBlocked,couponController.applyCoupon);
router.post('/checkout/removeCoupon', isAdminAuthenticated,checkUserBlocked,couponController.removeCoupon); 

module.exports = router;
