const express = require('express');
const router = express.Router();
const orderAdminController = require('../controllers/orderAdminController');
const authMiddleware=require('../middleware/authMiddleware')
const nocache=require('../middleware/noCacheMiddleware')


router.get('/orders', authMiddleware.isAdminAuthenticated,nocache,orderAdminController.getOrders);
router.post('/orders/:id/status', orderAdminController.updateOrderStatus);
router.post('/orders/:orderId/approveStatus',orderAdminController.approveStatus)

module.exports = router;
