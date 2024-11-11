const Order = require('../models/order');

// Get all orders (admin side)
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
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Admin controller function to update order status
const updateOrderStatus = async (req, res) => {
    const { orderId, productId, newStatus } = req.body;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Find the specific product in cartItems by productId
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



// Cancel order
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

module.exports = {
    getOrders,
    updateOrderStatus,
    cancelOrder,
};
