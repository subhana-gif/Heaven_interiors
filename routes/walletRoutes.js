const express = require('express');
const walletController = require('../controllers/walletController');
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware');
const router = express.Router();

router.get('/wallet', isAuthenticated, checkUserBlocked, walletController.renderWalletPage);
router.get('/wallet/balance', isAuthenticated, checkUserBlocked, walletController.getWalletBalance);
router.get('/wallet/transactions', isAuthenticated, checkUserBlocked, walletController.getWalletTransactions);


module.exports = router;
