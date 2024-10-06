const express = require('express');
const router = express.Router();
const authMiddleware=require('../middleware/authMiddleware')
const nocache=require('../middleware/noCacheMiddleware')

router.get('/settings', authMiddleware.isAdminAuthenticated,nocache,(req, res) => {
    res.render('adminPanel', { body: 'admin/settings' });
});

module.exports = router;
