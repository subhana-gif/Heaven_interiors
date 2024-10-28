const Coupon = require('../models/coupon');

// Get all coupons
exports.getAllCoupons = async (req, res) => {
    const search = req.query.search || ''; 
    let coupons = [];

    try {
        if (search) {
            coupons = await Coupon.find({ name: { $regex: search, $options: 'i' } }) .sort({ createdAt: -1 });;
        } else {
            coupons = await Coupon.find();
        }


        res.render('adminPanel', { 
            body: 'admin/coupons', 
            coupons,
            search, 
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).send('Server Error');
    }
};


// Add a new coupon
exports.addCoupon = async (req, res) => {
    const { code, discountType, discountValue, expirationDate, usageLimit, minimumPurchase, description, active } = req.body;
    try {
        const newCoupon = new Coupon({
            code,
            discountType,
            discountValue: parseFloat(discountValue),
            expirationDate,
            usageLimit,
            minimumPurchase,
            description, 
            isActive: active 
        });

        await newCoupon.save();
        res.redirect('/adminPanel/coupons');
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).send('Server Error');
    }
};

// Edit an existing coupon
exports.editCoupon = async (req, res) => {
    const { id } = req.params;
    const { code, discountType, discountValue, expirationDate, usageLimit, minimumPurchase, description, active } = req.body;
    
    try {
        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        coupon.code = code;
        coupon.discountType = discountType;
        coupon.discountValue = discountValue;
        coupon.expirationDate = expirationDate;
        coupon.usageLimit = usageLimit;
        coupon.minimumPurchase = minimumPurchase;
        coupon.description = description;
        coupon.isActive = active; 

        await coupon.save();
        res.redirect('/adminPanel/coupons');
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).send('Server Error');
    }
};


// Delete a coupon
exports.deleteCoupon = async (req, res) => {
    const { id } = req.params;

    try {
        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        // Use the deleteOne method to remove the coupon
        await Coupon.deleteOne({ _id: id });

        res.redirect('/adminPanel/coupons');
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).send('Server Error');
    }
};

// Apply coupon
exports.applyCoupon = async (req, res) => {
    const { couponCode } = req.body;
    const totalPrice = req.session.totalPrice; 
    try {
        const coupon = await Coupon.findOne({ 
            code: couponCode, 
            isActive: true, 
            expirationDate: { $gte: Date.now() } 
        });
        
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }

        if (totalPrice < coupon.minimumPurchase) {
            return res.status(400).json({ success: false, message: `Minimum purchase amount should be ${coupon.minimumPurchase}` });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (totalPrice * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
            }
        } else if (coupon.discountType === 'flat') {
            discountAmount = coupon.discountValue;
        }
    
        const newTotalPrice = totalPrice - discountAmount;
        req.session.totalPrice = newTotalPrice; // Update session
        req.session.discountAmount = discountAmount; // Store discount amount in session
        req.session.couponCode = couponCode; // Store coupon code in session

        if (coupon.usageLimit) {
            coupon.usedCount = (coupon.usedCount || 0) + 1; // Increment usedCount
            await coupon.save(); // Save changes to the coupon
        }

        return res.json({ success: true, message: 'Coupon applied successfully', newTotalPrice });
    } catch (error) {
        console.error('Error applying coupon:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


// Remove coupon
exports.removeCoupon = (req, res) => {
    const originalTotalPrice = req.session.originalTotalPrice; // Store the original price in session when applying coupon
    req.session.totalPrice = originalTotalPrice; // Reset total price
    return res.json({ success: true, message: 'Coupon removed successfully', newTotalPrice: originalTotalPrice });
};
