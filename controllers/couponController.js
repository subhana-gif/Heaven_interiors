const Coupon = require('../models/coupon');

exports.getAllCoupons = async (req, res) => {
    const search = req.query.search ? req.query.search.trim() : '';

    try {
        const currentpage = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (currentpage - 1) * limit;

        const searchQuery = search
        ? { code: { $regex: search, $options: 'i' } }  
        : {};
    
        const coupons = await Coupon.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        const totalCoupons = await Coupon.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCoupons / limit);
        let errorMessage=''
        res.render('adminPanel', { 
            body: 'admin/coupons', 
            coupons,
            search,
            totalPages,
            currentpage,
            errorMessage 
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).send('Server Error');
    }
};


exports.addCoupon = async (req, res) => {
    const { code, discountType, discountValue, expirationDate, usageLimit, minimumPurchase, description, active, search } = req.body;
    const today = new Date();
    const expDate = new Date(expirationDate);

    const coupons = await Coupon.find({});
    const currentpage = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (currentpage - 1) * limit;

    const searchQuery = search ? { name: { $regex: search, $options: 'i' } } : {};
    const totalCoupons = await Coupon.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalCoupons / limit);

    if (expDate <= today) {
        return res.render('adminPanel', {
            body: 'admin/coupons',
            coupons,
            search,
            totalPages,
            currentpage,
            errorMessage: 'Expiration date must be a future date',
            code, discountType, discountValue, expirationDate, usageLimit, minimumPurchase, description, active,
        });
    }

    try {
        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.render('adminPanel', {
                body: 'admin/coupons',
                coupons,
                search,
                totalPages,
                currentpage,
                errorMessage: 'Coupon code already exists. Please use a different code.',
                code, discountType, discountValue, expirationDate, usageLimit, minimumPurchase, description, active,
            });
        }

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

exports.editCoupon = async (req, res) => {
    const { id } = req.params;
    const { code, discountType, discountValue, expirationDate, usageLimit, minimumPurchase, description, active, search } = req.body;
    const today = new Date();
    const expDate = new Date(expirationDate);

    const coupons = await Coupon.find({});
    const currentpage = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (currentpage - 1) * limit;

    const searchQuery = search ? { name: { $regex: search, $options: 'i' } } : {};
    const totalCoupons = await Coupon.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalCoupons / limit);

    if (expDate <= today) {
        return res.render('adminPanel', {
            body: 'admin/coupons',
            coupons,
            search,
            totalPages,
            currentpage,
            errorMessage: 'Expiration date must be a future date',
            code, discountType, discountValue, expirationDate, usageLimit, minimumPurchase, description, active,
        });
    }

    try {
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        const existingCoupon = await Coupon.findOne({ code, _id: { $ne: id } });
        if (existingCoupon) {
            return res.render('adminPanel', {
                body: 'admin/coupons',
                coupons,
                search,
                totalPages,
                currentpage,
                errorMessage: 'Coupon code already exists. Please use a different code.',
                code, discountType, discountValue, expirationDate, usageLimit, minimumPurchase, description, active,
            });
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

// Inside your controller
exports.applyCoupon = async (req, res) => {
    const { couponCode } = req.body;
    const totalPrice = req.session.totalPrice; 
    
    // Check if a coupon is already applied
    if (req.session.couponCode) {
        return res.status(400).json({ success: false, message: 'A coupon is already applied.' });
    }

    try {
        const coupon = await Coupon.findOne({ 
            isDeleted: false,
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
        
        req.session.totalPrice = newTotalPrice;
        req.session.discountAmount = discountAmount; 
        req.session.couponCode = couponCode; 
        req.session.originalTotalPrice = totalPrice; // Store the original price

        if (coupon.usageLimit) {
            coupon.usedCount = (coupon.usedCount || 0) + 1; 
            await coupon.save();
        }

        return res.json({ success: true, message: 'Coupon applied successfully', discountAmount, newTotalPrice });
    } catch (error) {
        console.error('Error applying coupon:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.removeCoupon = (req, res) => {
    try {
        const originalTotalPrice = req.session.originalTotalPrice || req.session.totalPrice; 
        
        // Reset the session values related to the coupon
        req.session.totalPrice = originalTotalPrice; // Reset to the original price
        req.session.discountAmount = 0; // Clear the discount
        req.session.couponCode = null; // Clear the coupon code

        return res.json({ 
            success: true, 
            message: 'Coupon removed successfully', 
            newTotalPrice: originalTotalPrice // Send the original total price
        });
    } catch (error) {
        console.error('Error removing coupon:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};


exports.softDeleteCoupon = async (req, res) => {
    const { id } = req.params;
    try {
        await Coupon.findByIdAndUpdate(id, { isDeleted: true });
        res.redirect('/adminPanel/coupons');
    } catch (error) {
        console.error('Error soft deleting coupon:', error);
        res.status(500).send('Server Error');
    }
};


exports.restoreCoupon = async (req, res) => {
    const { id } = req.params;
    try {
        await Coupon.findByIdAndUpdate(id, { isDeleted: false });
        res.redirect('/adminPanel/coupons');
    } catch (error) {
        console.error('Error restoring coupon:', error);
        res.status(500).send('Server Error');
    }
};

