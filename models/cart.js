const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true }
});

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [cartItemSchema] // Array of cart items
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
