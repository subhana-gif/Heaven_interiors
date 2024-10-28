const Order = require('../models/order'); 
const User = require('../models/User')
const Wallet = require('../models/wallet')

exports.getOrders = async (req, res) => {
    try {
        if (!req.user)
             return res.redirect('/user/user_login');

        const userId = req.user._id;
        const search = req.query.search ? req.query.search.toLowerCase() : '';

        // Get the current pages for each status from query params
        const orderedPage = parseInt(req.query.orderedPage) || 1;
        const shippedPage = parseInt(req.query.shippedPage) || 1;
        const deliveredPage = parseInt(req.query.deliveredPage) || 1;
        const cancelledPage = parseInt(req.query.cancelledPage) || 1;
        const returnedPage = parseInt(req.query.cancelledPage) || 1;
        const limit = 10;

        // Pagination for "Ordered" orders
        const orders = await Order.find({ user: userId, status: 'Ordered' })
            .skip((orderedPage - 1) * limit)
            .limit(limit).sort({createdAt:-1});
        const totalOrdered = await Order.countDocuments({ user: userId, status: 'Ordered' });
        const totalOrderedPages = Math.ceil(totalOrdered / limit);

        // Pagination for "Shipped" orders
        const shippedOrders = await Order.find({ user: userId, status: 'Shipped' })
            .skip((shippedPage - 1) * limit)
            .limit(limit).sort({createdAt:-1});
        const totalShipped = await Order.countDocuments({ user: userId, status: 'Shipped' });
        const totalShippedPages = Math.ceil(totalShipped / limit);

        // Pagination for "Delivered" orders
        const deliveredOrders = await Order.find({ user: userId, status: 'Delivered' })
            .skip((deliveredPage - 1) * limit)
            .limit(limit).sort({createdAt:-1});
        const totalDelivered = await Order.countDocuments({ user: userId, status: 'Delivered' });
        const totalDeliveredPages = Math.ceil(totalDelivered / limit);

        // Pagination for "Cancelled" orders
        const cancelledOrders = await Order.find({ user: userId, status: 'Cancelled' })
            .skip((cancelledPage - 1) * limit)
            .limit(limit).sort({createdAt:-1});
        const totalCancelled = await Order.countDocuments({ user: userId, status: 'Cancelled' });
        const totalCancelledPages = Math.ceil(totalCancelled / limit);


        const returnedOrders = await Order.find({ user: userId, status: 'Returned' })
        .skip((returnedPage - 1) * limit)
        .limit(limit).sort({createdAt:-1});
        const totalReturned = await Order.countDocuments({ user: userId, status: 'Returned' });
        const totalReturnedPages = Math.ceil(totalReturned / limit);


        // Render orders page with data for each status and its pagination
        res.render('userSide/orders', {
            orders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            returnedOrders,
            search,
            orderedPage,
            returnedPage,
            totalOrderedPages,
            shippedPage,
            totalShippedPages,
            deliveredPage,
            totalDeliveredPages,
            cancelledPage,
            totalCancelledPages,
            totalReturnedPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


exports.cancelOrder = async (req, res) => {
    const { orderId, productId } = req.params;
    const { reason, otherReason, comments } = req.body; 
    const userId = req.user._id; 

    try {
        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the item in the order
        const item = order.cartItems.find(item => item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }

        // Update item and order status
        item.status = 'Cancelled';
        item.cancellationReason = reason === 'other' ? otherReason : reason;
        item.cancellationComments = comments;


        const refundAmount = order.totalPrice       
        order.amountRefunded = refundAmount;
        await order.save();
        
        // Check if all items are cancelled
        const allCancelled = order.cartItems.every(item => item.status === 'Cancelled');
        if (allCancelled) {
            order.status = 'Cancelled';
            await order.save();
        }


        // Handle refund to wallet (only if payment method is not COD)
        if (order.paymentMethod !== 'COD') {
            const wallet = await Wallet.findOne({ userId });

            // Log the wallet transaction
            if (wallet) {
                wallet.transactions.push({
                    amount: refundAmount,
                    type: 'credit',
                    description: `Refund for cancelled item from order ${orderId}`,
                    createdAt: new Date()
                });

                // Update wallet balance
                wallet.balance += refundAmount;
                await wallet.save();
            } else {
                // If wallet doesn't exist, create a new wallet
                const newWallet = new Wallet({
                    userId: userId,
                    balance: refundAmount,
                    transactions: [{
                        amount: refundAmount,
                        type: 'credit',
                        description: `Refund for cancelled item from order ${orderId}`,
                        createdAt: new Date()
                    }]
                });
                await newWallet.save();
            }
        } else {
        }

        return res.redirect('/user/orders');
    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.showCancelForm = async (req, res) => {
    const { orderId, productId } = req.params;

    try {
        // Find the order by ID
        const order = await Order.findById(orderId).populate('cartItems.productId'); // Populate if you want to display product details
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the specific item to cancel
        const item = order.cartItems.find(item => item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }

        // Render the order cancellation form
        res.render('userSide/orderCancel', {
            order,
            item,  // Pass the specific item the user is cancelling
        });
    } catch (error) {
        console.error('Error showing cancellation form:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


exports.returnOrder = async (req, res) => {
    const { orderId, productId } = req.params;
    const { reason, otherReason } = req.body;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const item = order.cartItems.find(item => item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }
            item.status = 'Returned';
            item.returnReason = reason === 'other' ? otherReason : reason;

            const allReturned = order.cartItems.every(item => item.status === 'Returned');
            if (allReturned) {
                order.status = 'Returned';
            }
            await order.save();
            return res.redirect('/user/orders');
    } catch (error) {
        console.error('Error returning order:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Show the return form
exports.showReturnForm = async (req, res) => {
    const { orderId, productId } = req.params;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Find the specific product in the cart items
        const item = order.cartItems.find(item => item.productId.toString() === productId);
        if (!item) {
            return res.status(404).send('Product not found in order');
        }

        // Render the return form with order and product details
        res.render('userSide/orderReturn', { order, item });
    } catch (error) {
        console.error('Error fetching order for return:', error);
        res.status(500).send('Server error');
    }
};

exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id; // Order ID from URL parameter
        const order = await Order.findById(orderId)
            .populate('user') // Populate user details if needed
            .populate('cartItems.productId'); // Populate product details if needed

        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

        // Calculate totalOriginalPrice by summing up price * quantity for each item in cartItems
        const totalOriginalPrice = order.cartItems.reduce((acc, item) => {
            return acc + item.price * item.quantity;
        }, 0);

        // Extract discount and coupon deduction from the order
        const totalDiscountFromOffers = order.discount || 0;
        const discountAmount = order.couponDeduction || 0;

        // Calculate final total price after applying discounts and coupon deduction
        const finalTotalPrice = totalOriginalPrice - totalDiscountFromOffers - discountAmount;

        // Render the order details page with the order and summary data
        res.render('userSide/orderDetails', { 
            order,
            totalOriginalPrice,
            totalDiscountFromOffers,
            discountAmount,
            finalTotalPrice
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        return res.status(500).render('error', { message: 'Internal Server Error' });
    }
};

