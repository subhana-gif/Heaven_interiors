const Order = require('../models/order');
const getIo=require('../socket')

// Get all orders (admin side)
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('user').sort({createdAt:-1});
        res.render('adminPanel', { orders, body: 'admin/orderAdmin' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Admin controller function to update order status
const updateOrderStatus = async (req, res) => {
    const { orderId } = req.body;
    const newStatus = req.body.newStatus;

    try {
        // Find the order by ID
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update the order status
        order.status = newStatus;

        // If the status is "Cancelled", also update the status of all cart items to "Cancelled"
        if (newStatus === 'Cancelled') {
            order.cartItems.forEach(item => {
                item.status = 'Cancelled';
            });
        }

        // Save the updated order
        await order.save();

        // Redirect back to the admin orders page or send a success response
        res.redirect('/adminPanel/orders');
    } catch (error) {
        console.error('Error updating order status:', error);
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
