const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true, 
    },
    offerType: {
        type: String,
        required: true,
        enum: ['product', 'category'],
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        validate: {
            validator: function (value) {
                if (this.offerType === 'product' || this.offerType === 'category') {
                    return !!value; 
                }
                return true; 
            },
            message: 'relatedId is required for product and category offers.'
        }
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true,
    },
    discountValue: {
        type: Number,
    },
    startDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                // Ensure startDate is less than endDate
                return this.endDate && value < this.endDate;
            },
            message: 'Start date must be earlier than end date.'
        }
    },
    endDate: {
        type: Date,
        required: true,
    },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;
