const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');

// Orders Route
router.get('/offers', (req, res) => {
    res.render('adminPanel', { body: 'admin/offers' });
});
module.exports = router;
