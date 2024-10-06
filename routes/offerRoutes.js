const express = require('express');
const router = express.Router();
const authMiddleware=require('../middleware/authMiddleware')
const noCache=require('../middleware/noCacheMiddleware')

router.get('/offers', authMiddleware.isAdminAuthenticated,noCache, (req, res) => {
    res.render('adminPanel', { body: 'admin/offers' });
});
module.exports = router;
