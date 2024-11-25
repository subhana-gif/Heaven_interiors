const Order = require('../models/order');
const Wallet = require('../models/wallet');
const Offer = require('../models/offer')
const { calculateDeliveryCharge } = require('../config/delivery');
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
        const product = await Product.find()

        res.render('adminPanel', {
            orders, 
            search,
            product,
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

            let wallet = await Wallet.findOne({ userId: order.user });
            if (!wallet) {
                wallet = new Wallet({
                    userId: order.user,
                    balance: 0,
                    transactions: []
                });
                await wallet.save();
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
    try {
        const { orderId } = req.params;
        const { productId } = req.query;
        
        // Fetch the order with cart items and category data
        const order = await Order.findById(orderId).populate({
            path: 'cartItems.productId',
            model: 'Product', // Reference to the Product model to populate productId
        })
            .populate('cartItems.category')
            .populate('cartItems.productId');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the item in the order
        const item = order.cartItems.find(item => item.productId.toString() === productId);
        
        if (!item) {
            console.error('Product not found. Cart Items:', order.cartItems);
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }

        // Calculate the base refund amount (total price of items in the order)
        const baseRefundAmount = item.price * item.quantity;
        const deliveryCharge = calculateDeliveryCharge(order.address.pinCode);             

        // Use let to allow re-assignment of itemDiscountShare
        let itemDiscountShare = 0;

        // Fetch any applicable product or category offer
        const offer = await Offer.findOne({
            isDeleted: false,
            $or: [
                { offerType: 'product', relatedId: item.productId },
                { offerType: 'category', relatedId: item.category._id }  // Using item.category._id for category comparison
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
            } else if (offer.offerType === 'category' && offer.relatedId.toString() === item.category._id.toString()) {
                if (offer.discountType === 'percentage') {
                    itemDiscountShare = (offer.discountValue / 100) * baseRefundAmount;
                } else if (offer.discountType === 'fixed') {
                    itemDiscountShare = offer.discountValue * item.quantity;
                }
            }
        }
        
        // Coupon deduction logic
        const discountAmount = order.couponDeduction || 0;
        const totalOrderPrice = order.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCouponShare = Math.round(((baseRefundAmount / totalOrderPrice) * discountAmount) * 100) / 100;
            
        const finalTotal = baseRefundAmount - itemDiscountShare - itemCouponShare + deliveryCharge;
        console.log('images:',item.productId.images);
        
        // Respond with the order details and calculated final total
        res.status(200).json({
            success: true,
            product: {
                id: item.productId, 
                name: item.name,
                price: item.price,
                category: item.category.name, // Extract category name
                images: item.productId.images || [],
                quantity: item.quantity,
                status: item.status,
            },
            totalPrice:baseRefundAmount,
            orderNumber: order.orderNumber,
            paymentMethod: order.paymentMethod,
            address: order.address,
            discount: itemDiscountShare, 
            coupon: itemCouponShare,
            deliveryCharge,
            finalTotal,
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


module.exports = {
    getOrders,
    updateOrderStatus,
    cancelOrder,
    approveStatus,
    viewDetails
};
