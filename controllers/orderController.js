const Order = require('../models/order'); 


exports.getOrders = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/user/user_login');
        }

        const userId = req.user._id;
        const search = req.query.search || ''; 
        const currentPage = parseInt(req.query.page) || 1; 
        const limit = 10;
        const skip = (currentPage - 1) * limit;

        // Fetch orders with pagination
        const orders = await Order.find({ user: userId })
        .skip(skip).limit(limit);
        
        const totalOrders = await Order.countDocuments({ user: userId }); 
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('userSide/orders', {
            orders,
            search,
            currentPage,
            totalPages,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.cancelOrder = async (req, res) => {
    const { orderId, productId } = req.params;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const item = order.cartItems.find(item => item.productId.toString() === productId);
        if (item) {
            item.status = 'Cancelled';

            const allCancelled = order.cartItems.every(item => item.status === 'Cancelled');
            if (allCancelled) {
                order.status = 'Cancelled';
            }

            await order.save();
            return res.redirect('/user/orders')
        } else {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.returnOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        res.redirect('/user/orders');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
