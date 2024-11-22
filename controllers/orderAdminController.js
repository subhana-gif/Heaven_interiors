const Order = require('../models/order');
const Wallet = require('../models/wallet');
const Offer = require('../models/offer')
const Product = require('../models/productModal')

const getOrders = async (req, res) => {

    try {
        const search = req.query.search ? req.query.search.trim() : '';
        const currentpage = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (currentpage - 1) * limit;
        const searchQuery = search
        ? { name: { $regex: search, $options: 'i' } }
        : {};
        
        const orders = await Order.find().populate('user').sort({createdAt:-1}) .skip(skip)
        .limit(limit);
        const totalOrders = await Order.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalOrders / limit);


        res.render('adminPanel', {
            orders, 
            search,
            body: 'admin/orderAdmin',
            totalPages,
            currentpage,
        });
    } catch (error) {
        console.error('error getting orders',error);
        res.status(500).send('Server Error');
    }
};

const updateOrderStatus = async (req, res) => {
    const { orderId, productId, newStatus } = req.body;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = order.cartItems.id(productId);
        if (product) {
            product.status = newStatus;
            if (newStatus === 'Delivered') {
                product.deliveredDate = new Date();
            }
        }

        await order.save();
        res.redirect('/adminPanel/orders');
    } catch (error) {
        console.error('Error updating product status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const cancelOrder = async (req, res) => {
    const { id } = req.params;
    try {
        await Order.findByIdAndUpdate(id, { status: 'Cancelled' });
        res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error cancelling order' });
    }
};

const approveStatus = async (req, res) => {
    const { orderId } = req.params;
    const { productId } = req.body;
    const action = req.query.action;

    try {
        const order = await Order.findById(orderId).populate('cartItems.productId');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const item = order.cartItems.find(item => item._id.toString() === productId);
        if (!item) return res.status(404).json({ message: 'Item not found in order' });

        if (action === 'approve') {
            if (item.returnReason) {
                item.status = 'Returned';
            } else if (item.cancellationReason) {
                item.status = 'Cancelled';
            }
            item.userRequestStatus = 'Approved';

            const baseRefundAmount = item.price * item.quantity;

            let itemDiscountShare = 0;
            let discountAmount = order.couponDeduction || 0;
            const offer = await Offer.findOne({
                isDeleted: false,
                $or: [
                    { offerType: 'product', relatedId: item.productId },
                    { offerType: 'category', relatedId: item.category }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            if (offer) {
                if (offer.offerType === 'product' && offer.relatedId.toString() === item.productId.toString()) {
                    if (offer.discountType === 'percentage') {
                        itemDiscountShare = (offer.discountValue / 100) * baseRefundAmount;
                    } else if (offer.discountType === 'fixed') {
                        itemDiscountShare = offer.discountValue * item.quantity;
                    }
                } else if (offer.offerType === 'category' && offer.relatedId.toString() === item.category.toString()) {
                    if (offer.discountType === 'percentage') {
                        itemDiscountShare = (offer.discountValue / 100) * baseRefundAmount;
                    } else if (offer.discountType === 'fixed') {
                        itemDiscountShare = offer.discountValue * item.quantity;
                    }
                }
            }

            const totalOrderPrice = order.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const itemCouponShare = Math.round(((baseRefundAmount / totalOrderPrice) * discountAmount) * 100) / 100;

            const refundAmount = baseRefundAmount - itemDiscountShare - itemCouponShare;

            const wallet = await Wallet.findOne({ userId: order.user });
            if (!wallet) {
                const newWallet = new Wallet({
                    userId: order.user,
                    balance: 0,
                    transactions: []
                });
                await newWallet.save();
            }

            if (wallet && order.paymentMethod !== 'COD') {
                wallet.transactions.push({
                    amount: refundAmount,
                    type: 'credit',
                    description: `Refund for item ${item.name}`,
                    createdAt: new Date()
                });

                wallet.balance += refundAmount;
                await wallet.save();
            }

        } else if (action === 'reject') {
            item.userRequestStatus = 'Rejected';
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        await order.save();

        res.redirect('/adminPanel/orders');
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).send('Server error');
    }
};

const viewDetails = async (req, res) => {
    const { orderId } = req.params;

    try {
        // Fetch the order using the order ID and populate product details
        const order = await Order.findById(orderId).populate('cartItems.productId');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        let totalRefundAmount = 0; // Initialize total refund amount
        let totalDiscountAmount = 0; // Total discount for the order
        let totalCouponDeduction = 0; // Total coupon deduction

        // Calculate the total price of the order
        const totalOrderPrice = order.cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        // Process each item in the cart
        for (let item of order.cartItems) {
            const baseRefundAmount = item.price * item.quantity;
            let itemDiscountShare = 0;
            let itemCouponShare = 0;

            // Fetch applicable offers for the product or category
            const offer = await Offer.findOne({
                isDeleted: false,
                $or: [
                    { offerType: 'product', relatedId: item.productId },
                    { offerType: 'category', relatedId: item.category }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            // Calculate the discount share for this item
            if (offer) {
                if (
                    offer.offerType === 'product' &&
                    offer.relatedId.toString() === item.productId._id.toString()
                ) {
                    itemDiscountShare =
                        offer.discountType === 'percentage'
                            ? (offer.discountValue / 100) * baseRefundAmount
                            : offer.discountValue * item.quantity;
                } else if (
                    offer.offerType === 'category' &&
                    offer.relatedId.toString() === item.productId.category?.toString()
                ) {
                    itemDiscountShare =
                        offer.discountType === 'percentage'
                            ? (offer.discountValue / 100) * baseRefundAmount
                            : offer.discountValue * item.quantity;
                }
            }

            // Apply coupon deduction proportionately
            const discountAmount = order.couponDeduction || 0;
            itemCouponShare = Math.round(
                (baseRefundAmount / totalOrderPrice) * discountAmount * 100
            ) / 100;

            // Calculate the total refund amount for this item
            const itemRefundAmount =
                baseRefundAmount - itemDiscountShare - itemCouponShare;

            // Add to the totals
            totalRefundAmount += itemRefundAmount;
            totalDiscountAmount += itemDiscountShare;
            totalCouponDeduction += itemCouponShare;
        }

        // Respond with order and refund details
        res.json({
            success: true,
            orderNumber: order.orderNumber,
            address: order.address,
            paymentMethod: order.paymentMethod,
            totalPrice: totalOrderPrice,
            totalDiscount: totalDiscountAmount,
            totalCouponDeduction: totalCouponDeduction,
            totalRefundAmount: totalRefundAmount,
            cartItems: order.cartItems.map((item) => ({
                productId: item.productId._id,
                name: item.productId.name,
                price: item.price,
                quantity: item.quantity,
                refundAmount:
                    item.price * item.quantity -
                    (totalDiscountAmount + totalCouponDeduction),
            })),
        });
    } catch (error) {
        console.error('Error viewing order details:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


module.exports = {
    getOrders,
    updateOrderStatus,
    cancelOrder,
    approveStatus,
    viewDetails
};
