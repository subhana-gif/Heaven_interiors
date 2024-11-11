const Order = require('../models/order'); 
const PDFDocument = require('pdfkit');
const Wallet = require('../models/wallet');
const Product = require('../models/productModal');
const Offer = require('../models/offer');
const { calculateDeliveryCharge } = require('../config/delivery');
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.getOrders = async (req, res) => {
    try {
        if (!req.user) return res.redirect('/user/user_login');

        const userId = req.user._id;
        const search = req.query.search ? req.query.search.toLowerCase() : '';

        const limit = 3;

        const paginateOrders = async (status, page, search) => {
            const query = {
                user: userId,
                'cartItems.status': status
            };

            if (search) {
                query.$or = [
                    { 'cartItems.name': { $regex: search, $options: 'i' } }, 
                    { 'orderNumber': { $regex: search, $options: 'i' } }, 
                ];
            }

            return await Order.find(query)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ createdAt: -1 });
        };

        const orderedPage = parseInt(req.query.orderedPage) || 1;
            
        const orderedOrders = await paginateOrders('Ordered', orderedPage, search);        
        const totalOrdered = await Order.countDocuments({ 
            user: userId, 
            cartItems: { $elemMatch: { status: 'Ordered' } },
            $or: [
                { 'cartItems.name': { $regex: search, $options: 'i' } },
                { orderNumber: { $regex: search, $options: 'i' } }
            ]
        });
        const totalOrderedPages = Math.ceil(totalOrdered / limit);
        

        const shippedPage = parseInt(req.query.shippedPage) || 1;
        const shippedOrders = await paginateOrders('Shipped', shippedPage, search);
        const totalShipped = await Order.countDocuments({ 
            user: userId, 
            cartItems: { $elemMatch: { status: 'Shipped' } },
            $or: [
                { 'cartItems.name': { $regex: search, $options: 'i' } },
                { orderNumber: { $regex: search, $options: 'i' } }
            ]
        });
        const totalShippedPages = Math.ceil(totalShipped / limit);

        const deliveredPage = parseInt(req.query.deliveredPage) || 1;
        const deliveredOrders = await paginateOrders('Delivered', deliveredPage, search);
        const totalDelivered = await Order.countDocuments({ 
            user: userId, 
            cartItems: { $elemMatch: { status: 'Delivered' } },
            $or: [
                { 'cartItems.name': { $regex: search, $options: 'i' } },
                { orderNumber: { $regex: search, $options: 'i' } }
            ]
        });
        const totalDeliveredPages = Math.ceil(totalDelivered / limit);

        const cancelledPage = parseInt(req.query.cancelledPage) || 1;
        const cancelledOrders = await paginateOrders('Cancelled', cancelledPage, search);
        const totalCancelled = await Order.countDocuments({ 
            user: userId, 
            cartItems: { $elemMatch: { status: 'Cancelled' } },
            $or: [
                { 'cartItems.name': { $regex: search, $options: 'i' } },
                { orderNumber: { $regex: search, $options: 'i' } }
            ]
        });
        const totalCancelledPages = Math.ceil(totalCancelled / limit);

        const returnedPage = parseInt(req.query.returnedPage) || 1;
        const returnedOrders = await paginateOrders('Returned', returnedPage, search);
        const totalReturned = await Order.countDocuments({ 
            user: userId, 
            cartItems: { $elemMatch: { status: 'Returned' } },
            $or: [
                { 'cartItems.name': { $regex: search, $options: 'i' } },
                { orderNumber: { $regex: search, $options: 'i' } }
            ]
        });
        const totalReturnedPages = Math.ceil(totalReturned / limit);

        const pendingPage = parseInt(req.query.pendingPage) || 1;
        const pendingOrders = await paginateOrders('Payment Pending', pendingPage, search);
        const totalPending = await Order.countDocuments({ 
            user: userId, 
            cartItems: { $elemMatch: { status: 'Payment Pending' } },
            $or: [
                { 'cartItems.name': { $regex: search, $options: 'i' } },
                { orderNumber: { $regex: search, $options: 'i' } }
            ]
        });
        const totalPendingPages = Math.ceil(totalPending / limit);

        res.render('userSide/orders', {
            orders: orderedOrders, 
            orderedOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            returnedOrders,
            pendingOrders,
            search,
            orderedPage,
            shippedPage,
            deliveredPage,
            cancelledPage,
            returnedPage,
            pendingPage,
            totalOrderedPages,
            totalShippedPages,
            totalDeliveredPages,
            totalCancelledPages,
            totalReturnedPages,
            totalPendingPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        const order = await Order.findById(orderId).populate('cartItems.productId');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const discountAmount = order.couponDeduction || 0;
        
        // Assume deliveryCharge is calculated based on the order address's pincode
        const deliveryCharge = calculateDeliveryCharge(order.address.pinCode); // Implement this function based on your logic

        let totalOriginalPrice = 0;
        let totalDiscountFromOffers = 0;
        let totalDiscountedPrice = 0;

        const detailedCart = await Promise.all(order.cartItems.map(async (item) => {
            const product = await Product.findById(item.productId);
            let discountedPrice = product.price;

            // Fetch applicable offer and calculate discounted price
            const offer = await Offer.findOne({
                isDeleted: false,
                $or: [
                    { offerType: 'product', relatedId: product._id },
                    { offerType: 'category', relatedId: product.category }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            if (offer) {
                discountedPrice = offer.discountType === 'percentage'
                    ? product.price * (1 - offer.discountValue / 100)
                    : product.price - offer.discountValue;
                discountedPrice = parseFloat(discountedPrice.toFixed(2)) || product.price;
            }

            const itemTotalOriginalPrice = product.price * item.quantity;
            const itemTotalDiscountedPrice = discountedPrice * item.quantity;

            totalOriginalPrice += itemTotalOriginalPrice;
            totalDiscountedPrice += itemTotalDiscountedPrice;
            totalDiscountFromOffers += itemTotalOriginalPrice - itemTotalDiscountedPrice;

            return {
                name: product.name,
                quantity: item.quantity,
                price: product.price,
                discountedPrice,
                itemTotalOriginalPrice,
                itemTotalDiscountedPrice,
            };
        }));

        // Recalculate final total price including delivery charge
        const finalTotalPrice = totalDiscountedPrice - discountAmount + deliveryCharge;

        // Generate PDF
        const pdfDoc = new PDFDocument();

        pdfDoc.registerFont('NotoSans', './fonts/NotoSans-Regular.ttf');
        pdfDoc.font('NotoSans'); 

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderNumber}.pdf`);

        pdfDoc.pipe(res);
        pdfDoc.fontSize(20).text('Invoice', { align: 'center' });
        pdfDoc.moveDown();
        pdfDoc.fontSize(12).text(`Order ID: ${order.orderNumber}`);
        pdfDoc.text(`Date: ${new Date(order.createdAt).toDateString()}`);
        pdfDoc.text(`Payment Method: ${order.paymentMethod}`);
        
        pdfDoc.moveDown();
        pdfDoc.fontSize(15).text('Shipping Address:', { underline: true });
        pdfDoc.fontSize(12).text(`${order.address.name}`);
        pdfDoc.text(`${order.address.mobileNumber}`);
        pdfDoc.text(`${order.address.city}, ${order.address.state}, ${order.address.pinCode}`);
        
        pdfDoc.moveDown();
        pdfDoc.fontSize(15).text('Items Ordered:', { underline: true });
        detailedCart.forEach(item => {
            pdfDoc.fontSize(12).text(`${item.name} - Quantity: ${item.quantity} - Price: ₹${item.price*item.quantity}`);
        });

        pdfDoc.moveDown();
        pdfDoc.fontSize(15).text('Order Summary:', { underline: true });
        pdfDoc.fontSize(12).text(`Total Original Price: ₹${totalOriginalPrice.toFixed(2)}`);
        pdfDoc.text(`Total Discount from Offers: -₹${totalDiscountFromOffers.toFixed(2)}`);
        pdfDoc.text(`Coupon Discount: ₹${discountAmount.toFixed(2)}`);
        pdfDoc.text(`Delivery Charge: ₹${deliveryCharge.toFixed(2)}`); // New Line for Delivery Charge
        pdfDoc.text(`Total Price: ₹${finalTotalPrice.toFixed(2)}`);

        pdfDoc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
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

        // Update item status and cancellation details
        item.status = 'Cancelled';
        item.cancellationReason = reason === 'other' ? otherReason : reason;
        item.cancellationComments = comments;

        const totalOrderPrice = order.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalDiscountFromOffers = order.discount || 0;
        const discountAmount = order.couponDeduction || 0;
        const deliveryCharge = calculateDeliveryCharge(order.address.pinCode);

        // Calculate the item's base refund amount
        const baseRefundAmount = item.price * item.quantity;
        const offer = await Offer.findOne({
            isDeleted: false,
            $or: [
                { offerType: 'product', relatedId: item.productId },
                { offerType: 'category', relatedId: item.category }
            ],
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        let itemDiscountShare = 0;

        if (offer) {
            if (offer.offerType === 'product' && offer.relatedId.toString() === item.productId.toString()) {
                if (offer.discountType === 'percentage') {
                    itemDiscountShare = (offer.discountValue / 100) * baseRefundAmount;
                } else if (offer.discountType === 'fixed') {
                    itemDiscountShare = offer.discountValue * item.quantity;
                }
            } else if (offer.offerType === 'category' && offer.relatedId.toString() === item.category.toString()) {
                if (offer.discountType === 'percentage') {
                    itemDiscountShare = (offer.discountValue / 100) * originalPrice;
                } else if (offer.discountType === 'fixed') {
                    itemDiscountShare = offer.discountValue * item.quantity;
                }
            }
        }
        

        // For products without an offer, apply no offer discount

        // Calculate the item's share of the coupon deduction, applied proportionally across all items
        const itemCouponShare = Math.round(((baseRefundAmount / totalOrderPrice) * discountAmount) * 100) / 100;
        const refundAmount = baseRefundAmount - itemDiscountShare - itemCouponShare;

        // Update amount refunded at the order level
        order.amountRefunded = (order.amountRefunded || 0) + refundAmount;
        await order.save();
        
        // Check if all items are cancelled
        const allCancelled = order.cartItems.every(item => item.status === 'Cancelled');
        if (allCancelled) {
            order.status = 'Cancelled';
            await order.save();
        }

        // Handle wallet update if not COD
        if (order.paymentMethod !== 'COD') {
            const wallet = await Wallet.findOne({ userId });

            // Log the wallet transaction
            if (wallet) {
                wallet.transactions.push({
                    amount: refundAmount,
                    type: 'credit',
                    description: `Refund for cancelled item from order ${order.orderNumber}`,
                    createdAt: new Date()
                });

                // Update wallet balance
                wallet.balance += refundAmount;
                await wallet.save();
            } else {
                // Create a new wallet if it doesn't exist
                const newWallet = new Wallet({
                    userId: userId,
                    balance: refundAmount,
                    transactions: [{
                        amount: refundAmount,
                        type: 'credit',
                        description: `Refund for cancelled item from order ${order.orderNumber}`,
                        createdAt: new Date()
                    }]
                });
                
                await newWallet.save();
            }
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
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate('user')
            .populate('cartItems.productId');

        if (!order) {
            return res.status(404).render('error', { message: 'Order not found' });
        }

        const totalOrderPrice = order.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        console.log('total order price:',totalOrderPrice);
        
        // Extract discount and coupon deduction from the order
        const totalDiscountFromOffers = order.discount || 0;
        const discountAmount = order.couponDeduction || 0;

        // Calculate delivery charge based on the pin code
        const deliveryCharge = calculateDeliveryCharge(order.address.pinCode);

        // Prepare item-level breakdown
        const itemDetails = await Promise.all(order.cartItems.map(async (item) => {
            const originalPrice = item.price * item.quantity;
            console.log('original price:',originalPrice);
            const offer = await Offer.findOne({
                isDeleted: false,
                $or: [
                    { offerType: 'product', relatedId: item.productId },
                    { offerType: 'category', relatedId: item.category }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            let itemDiscountShare = 0;
            if (offer) {
                if (offer.offerType === 'product' && offer.relatedId.toString() === item.productId.toString()) {
                    if (offer.discountType === 'percentage') {
                        itemDiscountShare = (offer.discountValue / 100) * originalPrice;
                    } else if (offer.discountType === 'fixed') {
                        itemDiscountShare = offer.discountValue * item.quantity;
                    }
                } else if (offer.offerType === 'category' && offer.relatedId.toString() === item.category.toString()) {
                    if (offer.discountType === 'percentage') {
                        itemDiscountShare = (offer.discountValue / 100) * originalPrice;
                    } else if (offer.discountType === 'fixed') {
                        itemDiscountShare = offer.discountValue * item.quantity;
                    }
                }
            }
            console.log('discount share:',itemDiscountShare);
            const itemCouponShare = Math.round(((originalPrice / totalOrderPrice) * discountAmount) * 100) / 100;
            console.log('coupon',itemCouponShare);
            const finalItemPrice = originalPrice - itemDiscountShare - itemCouponShare;
            console.log('final item',finalItemPrice);
            
            return {
                name: item.name,
                image: item.image,
                quantity: item.quantity,
                pricePerUnit: item.price,
                originalPrice,
                itemDiscountShare,
                itemCouponShare,
                finalItemPrice
            };
        }));

        const finalTotalPrice = itemDetails.reduce((sum, item) => sum + item.finalItemPrice, 0) + deliveryCharge;
        console.log('final total:',finalTotalPrice);
        
        // Render the order details page with the order and item breakdown
        res.render('userSide/orderDetails', { 
            order,
            itemDetails,
            totalDiscountFromOffers,
            discountAmount,
            deliveryCharge, 
            finalTotalPrice
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        return res.status(500).render('error', { message: 'Internal Server Error' });
    }
};

exports.retryPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const paymentOptions = {
            amount: order.totalPrice * 100, // amount in paise (multiply by 100 for rupees)
            currency: 'INR',
            receipt: `receipt_retry_${order._id}`,
            payment_capture: 1,
        };
        const razorpayOrder = await razorpay.orders.create(paymentOptions);
        res.json({
            success: true,
            orderId: razorpayOrder.id,
            amount: paymentOptions.amount,
            currency: paymentOptions.currency,
            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error("Error creating retry Razorpay order:", error);
        res.status(500).json({ success: false, message: 'Failed to retry payment' });
    }
};

exports.confirmPayment = async (req, res) => {    
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update the overall order status and payment status
        order.status = 'Ordered';
        order.paymentStatus = 'Success';

        // Update the status of each item in cartItems to "Ordered"
        order.cartItems.forEach((item) => {
            item.status = 'Ordered';
            item.statusHistory.push({ status: 'Ordered', updatedAt: new Date() }); // Update the status history
        });

        // Save the updated order
        await order.save();

        // Prepare data for rendering the order confirmation page
        const detailedCart = order.cartItems;
        const totalDiscountFromOffers = order.discount;
        const finalTotalPrice = order.totalPrice;
        const discountAmount = order.couponDeduction;
        const deliveryCharge = calculateDeliveryCharge(order.address.pinCode);
        const totalOriginalPrice = finalTotalPrice + totalDiscountFromOffers + discountAmount - deliveryCharge;

        // Render the order confirmation page with the updated order details
        res.render('userSide/orderConfirmation', { 
            order,
            detailedCart, 
            totalOriginalPrice, 
            totalDiscountFromOffers, 
            finalTotalPrice,
            discountAmount, 
            deliveryCharge, 
        });

    } catch (error) {
        console.error("Error confirming payment:", error);
        res.status(500).json({ success: false, message: 'Failed to confirm payment' });
    }
};



