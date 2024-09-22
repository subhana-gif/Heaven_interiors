const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Orders Route
router.get('/settings', (req, res) => {
    res.render('adminPanel', { body: 'admin/settings' });
});

module.exports = router;
