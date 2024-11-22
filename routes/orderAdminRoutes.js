const express = require('express');
const router = express.Router();
const orderAdminController = require('../controllers/orderAdminController');
const { isAdminAuthenticated } = require('../middleware/authMiddleware');
const nocache=require('../middleware/noCacheMiddleware')


router.get('/orders',isAdminAuthenticated,nocache,orderAdminController.getOrders);
router.post('/orders/:id/status',isAdminAuthenticated,orderAdminController.updateOrderStatus);
router.post('/orders/:orderId/approveStatus',isAdminAuthenticated,orderAdminController.approveStatus)
router.get('/orders/:orderId/details',isAdminAuthenticated,orderAdminController.viewDetails)

module.exports = router;
