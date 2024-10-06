const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    isBlocked: { type: Boolean, default: false },
    addresses: [addressSchema],
});

const Customer = mongoose.model('Customers', customerSchema);

module.exports =Customer;
