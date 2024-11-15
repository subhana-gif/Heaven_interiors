const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    quantity: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['Ordered', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Payment Pending'],
        default: 'Ordered'
    },
    image: { type: String, required: true },
    returnReason: { type: String },  
    cancellationReason: { type: String },  
    deliveredDate: { type: Date },
    statusHistory: [
        {
            status: { 
                type: String, 
                enum: ['Ordered', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Payment Pending'],
            },
            updatedAt: { type: Date, default: Date.now }
        }
    ],
    userRequestStatus: {
        type: String,
        enum: ['None', 'Pending Approval', 'Approved', 'Rejected'],
        default: 'None' 
    }
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cartItems: [cartItemSchema],  
    paymentMethod: { type: String, required: true },
    address: {
        name: { type: String, required: true },
        mobileNumber: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pinCode: { type: String, required: true }
    },
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 }, 
    coupon: { type: String },
    couponDeduction: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Failed', 'Success'], 
        default: 'Pending'
    },
    status: { 
        type: String, 
        enum: ['Ordered', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Payment Pending'],
        default: 'Ordered'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deliveredDate: { type: Date }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
