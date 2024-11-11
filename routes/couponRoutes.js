const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

router.get('/coupons', couponController.getAllCoupons);
router.post('/coupons/add', couponController.addCoupon);
router.post('/coupons/edit/:id', couponController.editCoupon);
router.post('/coupons/delete/:id', couponController.softDeleteCoupon);
router.post('/coupons/restore/:id', couponController.restoreCoupon);

module.exports = router;
