// routes/offerRoutes.js

const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../middleware/authMiddleware');
const offerController = require('../controllers/offerController');

router.get('/offers', isAdminAuthenticated, offerController.getOffers);
router.post('/offers/add', isAdminAuthenticated, offerController.addOffer);
router.post('/offers/edit/:id', isAdminAuthenticated, offerController.editOffer);
router.post('/offers/delete/:id', isAdminAuthenticated, offerController.deleteOffer);

module.exports = router;
