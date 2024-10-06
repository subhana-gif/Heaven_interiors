const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    stock: { type: Number, required: true },
    stockStatus: {type: String,enum: ['In Stock', 'Out of Stock'],required: true},
    images: [{ type: String }],
    specifications: { type: Object, default: {} }, 
    highlights: { type: [String], default: [] },
            isDelete: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });


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


productSchema.pre('save', function (next) {
    if (this.stock <= 0) {
        this.stock = 0; // Ensure stock doesn't go negative
        this.stockStatus = 'Out of Stock'; // Set status to out of stock
    } else {
        this.stockStatus = 'In Stock'; // Set status to in stock if stock is greater than zero
    }
    next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
