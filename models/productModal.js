const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    stock: { type: Number, required: true },
    stockStatus: {type: String,enum: ['In Stock', 'Out of Stock'],required: true},
    images: [{ type: String }],
    specifications: { type: Object, default: {} }, // Ensure this is an object
    highlights: { type: [String], default: [] },
            isDelete: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true }); // This will automatically add createdAt and updatedAt fields


const reviewSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
