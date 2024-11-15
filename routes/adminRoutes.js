const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const noCache = require('../middleware/noCacheMiddleware');

router.get('/login', adminController.renderLoginPage);  
router.post('/login', adminController.handleLogin); 
router.get('/', authMiddleware.isAdminAuthenticated,noCache, adminController.renderAdminPanel);
router.get('/dashboard', authMiddleware.isAdminAuthenticated,noCache, (req, res) => {
    res.render('adminPanel', { body: 'admin/dashboard' });
});

router.get('/logout', adminController.logout);

module.exports = router;
