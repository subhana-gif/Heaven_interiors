const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const noCache = require('../middleware/noCacheMiddleware');

// Admin Routes
router.get('/login', adminController.renderLoginPage);  // GET request for login page
router.post('/login', adminController.handleLogin);     // POST request to handle login

// Protect both '/' and '/dashboard' routes with the authentication middleware
router.get('/', authMiddleware.isAdminAuthenticated,noCache, adminController.renderAdminPanel);
router.get('/dashboard', authMiddleware.isAdminAuthenticated,noCache, (req, res) => {
    res.render('adminPanel', { body: 'admin/dashboard' });
});

router.get('/logout', adminController.logout);

module.exports = router;
