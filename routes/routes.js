// routes/index.js

const express = require('express');
const router = express.Router();

const adminRoutes = require('./adminRoutes');
const dashboardRoutes = require('./dashboardRoutes')
const categoryRoutes = require('./categoryRoutes');
const customerRoutes = require('./customerRoutes');
const productRoutes = require('./productRoutes');
const orderAdminRoutes = require('./orderAdminRoutes');
const couponRoutes = require('./couponRoutes');

const authRoutes = require('./auth');
const userRoutes = require('./userRoutes');
const otpRoutes = require('./otpRoutes');
const homeRoutes = require('./homeRoutes');
const userProductRoutes = require('./userProductRoutes');
const cartRoutes = require('./cartRoutes');
const checkoutRoutes = require('./checkoutRoutes');
const orderRoutes = require('./orderRoutes');
const profileRoutes = require('./profileRoutes');
const searchRoutes = require('./searchRoutes');
const wishlistRotes = require('./wishlistRoutes')
const walletRoutes = require('./walletRoutes')
const offerRoutes = require('./offerRoutes')


// Admin Routes
router.use('/adminPanel', adminRoutes);
router.use('/adminPanel',dashboardRoutes)
router.use('/adminPanel', categoryRoutes);
router.use('/adminPanel', customerRoutes);
router.use('/adminPanel', productRoutes);
router.use('/adminPanel', orderAdminRoutes);
router.use('/adminPanel', couponRoutes);
router.use('/adminPanel',offerRoutes)

// User Routes
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/user', otpRoutes);
router.use('/user', homeRoutes);
router.use('/user', userProductRoutes);
router.use('/user', cartRoutes);
router.use('/user', checkoutRoutes);
router.use('/user', orderRoutes);
router.use('/user', profileRoutes);
router.use('/user', searchRoutes);
router.use('/user',wishlistRotes)
router.use('/user',walletRoutes)


module.exports = router;
