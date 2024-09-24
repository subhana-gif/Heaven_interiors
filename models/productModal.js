const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 }, // Discount percentage
    rating: { type: Number, default: 0 }, // Average rating
    stock: { type: Number, required: true },
    highlights: [String], // Array of highlights
    reviews: [{ // Nested reviews
        userName: String,
        comment: String,
        rating: Number
    }],
    images: [String],
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    isDelete: { type: Boolean, default: false }
});

module.exports = mongoose.model('Product', productSchema);
