const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');

router.get('/offers', (req, res) => {
    res.render('adminPanel', { body: 'admin/offers' });
});
module.exports = router;
