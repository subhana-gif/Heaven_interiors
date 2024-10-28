const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    offerType: {
        type: String, // 'product', 'category', or 'referral'
        required: true,
        enum: ['product', 'category', 'referral'], // Restrict values to these types
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        // Custom validation: Only required for product and category
        validate: {
            validator: function (value) {
                if (this.offerType === 'product' || this.offerType === 'category') {
                    return !!value; // relatedId must be present
                }
                return true; // If referral, skip validation
            },
            message: 'relatedId is required for product and category offers.'
        }
    },
    discountType: {
        type: String, // 'percentage' or 'fixed'
        required: function() {
            return this.offerType !== 'referral'; // Only required for product and category offers
        },
    },
    discountValue: {
        type: Number,
        required: function() {
            return this.offerType !== 'referral'; // Only required for product and category offers
        },
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    referralCode: {
        type: String,
        required: function() {
            return this.offerType === 'referral'; // Only required for referral offers
        },
    },
    referrerReward: {
        type: Number, // Amount or percentage
        required: function() {
            return this.offerType === 'referral'; // Only required for referral offers
        },
    },
    refereeReward: {
        type: Number, // Amount or percentage
        required: function() {
            return this.offerType === 'referral'; // Only required for referral offers
        },
    },
}, { timestamps: true });

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;
