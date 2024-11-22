const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const {isAdminAuthenticated}=require('../middleware/authMiddleware')

router.get('/coupons',isAdminAuthenticated,couponController.getAllCoupons);
router.post('/coupons/add',isAdminAuthenticated,couponController.addCoupon);
router.post('/coupons/edit/:id',isAdminAuthenticated,couponController.editCoupon);
router.post('/coupons/delete/:id',isAdminAuthenticated,couponController.softDeleteCoupon);
router.post('/coupons/restore/:id',isAdminAuthenticated,couponController.restoreCoupon);

module.exports = router;
