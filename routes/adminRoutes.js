const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin Routes
router.get('/login', adminController.renderLoginPage);  // GET request for login page
router.post('/login', adminController.handleLogin);     // POST request to handle login

router.get('/', adminController.renderAdminPanel);  // GET request for admin panel
router.get('/dashboard', (req, res) => {
    res.render('adminPanel', { body: 'admin/dashboard' });
});
router.get('/logout', adminController.logout);
module.exports = router;
