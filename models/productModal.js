const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discountedPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 }, 
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    stock: { type: Number, required: true },
    stockStatus: {type: String,enum: ['In Stock', 'Out of Stock'],required: true},
    images: [{ type: String }],
    specifications: { type: Object, default: {} }, 
    estimatedDeliveryDate: { type: Date },
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
        this.stock = 0;
        this.stockStatus = 'Out of Stock'; 
    } else {
        this.stockStatus = 'In Stock';
    }
    next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
