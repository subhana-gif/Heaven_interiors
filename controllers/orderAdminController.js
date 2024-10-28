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
    const { orderId,newStatus } = req.body;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.status = newStatus;


        if (newStatus === 'Delivered') {
            order.deliveredDate = new Date();
            console.log("Delivered Date Set To:", order.deliveredDate); 
        }


        await order.save();

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
