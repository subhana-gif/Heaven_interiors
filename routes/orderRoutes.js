const express = require('express');
const router = express.Router();
const orderController=require('../controllers/orderController')
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 
const { order } = require('paypal-rest-sdk');

router.get('/orders',isAuthenticated,checkUserBlocked,orderController.getOrders);
router.post('/orders/cancellation/:orderId/:productId', isAuthenticated, checkUserBlocked, orderController.cancelOrder);
router.get('/orders/cancellationForm/:orderId/:productId', isAuthenticated, checkUserBlocked, orderController.showCancelForm);
router.get('/orders/returnForm/:orderId/:productId', isAuthenticated, checkUserBlocked, orderController.showReturnForm);
router.post('/orders/return/:orderId/:productId', isAuthenticated, checkUserBlocked, orderController.returnOrder);
router.get('/orders/:id', isAuthenticated,checkUserBlocked,orderController.getOrderDetails);
router.get('/orders/download-invoice/:orderId',isAuthenticated,checkUserBlocked,orderController.getInvoice);
router.post('/orders/retryPayment/:orderId', isAuthenticated,checkUserBlocked,orderController.retryPayment);
router.get('/orders/confirmation/:orderId', isAuthenticated,checkUserBlocked,orderController.confirmPayment);
module.exports = router;
