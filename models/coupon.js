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
        default: null, 
        min: 0, 
    },
    expirationDate: {
        type: Date,
        required: true,
    },
    minimumPurchase: {
        type: Number,
        default: 0, 
        min: 0, 
    },
    usageLimit: {
        type: Number,
        default: null, 
        min: 1, 
    },
    usedCount: {
        type: Number,
        default: 0, 
        min: 0,
    },
    userUsageLimit: {
        type: Number,
        default: 1,
        min: 1, 
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
    description: {
        type: String,
        required: false, 
        trim: true,
    },
});

couponSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
