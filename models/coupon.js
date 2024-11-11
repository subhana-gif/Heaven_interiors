const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    isDeleted: { type: Boolean, default: false },
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        required: true,
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0,
    },
    maxDiscountAmount: {
        type: Number,
        default: null, // Maximum discount amount for percentage-based coupons
        min: 0, // Ensure this value is positive
    },
    expirationDate: {
        type: Date,
        required: true,
    },
    minimumPurchase: {
        type: Number,
        default: 0, // Minimum cart total required to apply the coupon
        min: 0, // Ensure this value is positive
    },
    usageLimit: {
        type: Number,
        default: null, // Total times the coupon can be used (across all users)
        min: 1, // Ensure this value is positive
    },
    usedCount: {
        type: Number,
        default: 0, // Number of times the coupon has been used
        min: 0, // Ensure this value is positive
    },
    userUsageLimit: {
        type: Number,
        default: 1, // Number of times a single user can use the coupon
        min: 1, // Ensure this value is positive
    },
    usedCount: { 
        type: Number, 
        default: 0 },
    isActive: {
        type: Boolean,
        default: true, 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    description: { // Short description for the coupon
        type: String,
        required: false, // Make this optional
        trim: true,
    },
});

// Middleware to update the updatedAt timestamp before saving
couponSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
