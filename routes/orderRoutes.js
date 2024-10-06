const express = require('express');
const router = express.Router();
const orderController=require('../controllers/orderController')
const { isAuthenticated, checkUserBlocked } = require('../middleware/authUserMiddleware'); 

router.get('/orders',isAuthenticated,checkUserBlocked,orderController.getOrders);
router.post('/orders/cancellation/:orderId/:productId', isAuthenticated,checkUserBlocked,orderController.cancelOrder);
router.post('/orders/return',isAuthenticated,checkUserBlocked,orderController.returnOrder)

module.exports = router;
