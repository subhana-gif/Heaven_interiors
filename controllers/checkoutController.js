const Address = require('../models/Address'); 
const Product=require('../models/productModal');
const Order=require('../models/order')
const Coupon = require('../models/coupon')
const {calculateDeliveryCharge} = require('../config/delivery')
const Offer = require('../models/offer')
const Wallet = require('../models/wallet')
const Category = require('../models/category');

require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const { v4: uuidv4 } = require('uuid');

function generateOrderNumber() {
    const prefix = 'OD';
    const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000);
    return `${prefix}${randomNumber}`;
}

exports.getDeliveryCharge = async (req, res) => {
    try {
        const address = await Address.findById(req.params.addressId);
        if (address && address.pinCode) {
            const deliveryCharge = calculateDeliveryCharge(address.pinCode);
            const cartTotal = req.session.totalPrice || 0; 
            
            res.json({
                success: true,
                deliveryCharge,
                cartTotal
            });
        } else {
            res.json({ success: false, message: 'Address not found or missing pin code.' });
        }
    } catch (error) {
        console.error('Error calculating delivery charge:', error);
        res.json({ success: false, message: 'Error calculating delivery charge' });
    }
};

exports.createOrder = async (req, res) => {
    const { selectedAddress, couponCode } = req.body;
    const cart = req.session.cart || [];

    if (!cart || cart.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
    }

    try {
        let subtotal = 0;
        for (const item of cart) {
            const productFromDb = await Product.findById(item.productId);
            if (!productFromDb) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const offer = await Offer.findOne({
                $or: [
                    { offerType: 'product', relatedId: productFromDb._id },
                    { offerType: 'category', relatedId: productFromDb.category }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            const unitPrice = offer
                ? offer.discountType === 'percentage'
                    ? productFromDb.price * (1 - offer.discountValue / 100)
                    : productFromDb.price - offer.discountValue
                : productFromDb.discountedPrice || productFromDb.price;
            
            subtotal += unitPrice * item.quantity;
        }

        const couponCode = req.session.couponCode || null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, isDeleted: false, isActive: true, expirationDate: { $gte: Date.now() } });
            if (coupon) {
                if (coupon.discountType === 'percentage') {
                    subtotal *= (1 - coupon.discountValue / 100);
                } else if (coupon.discountType === 'fixed') {
                    subtotal -= coupon.discountValue;
                }
                subtotal = Math.max(subtotal, 0); 
            }
        }
        

        const address = await Address.findById(selectedAddress);
        const deliveryCharge = calculateDeliveryCharge(address.pinCode)
        

        const finalAmount = subtotal  + deliveryCharge;
        
        
        const options = {
            amount: Math.round(finalAmount * 100), // Convert to paisa
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`
        };

        const order = await razorpay.orders.create(options);

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID, 
            discountedSubtotal: subtotal,
            deliveryCharge,
            finalAmount
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Failed to create Razorpay order' });
    }
};

exports.getCheckoutPage = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/user_login');
        }

        if (!req.session.cart) {
            req.session.cart = [];
        }

        // Clear previously applied coupon for a fresh checkout
        req.session.couponCode = null;
        req.session.appliedCoupon = null;

        const coupons = await Coupon.find({ isDeleted: false, isActive: true, expirationDate: { $gte: Date.now() } });
        const wallet = await Wallet.findOne({ userId: req.user._id });
        const walletBalance = wallet ? wallet.balance : 0;

        const addresses = await Address.find({ userId: req.user._id });

        const selectedAddressId = req.body.selectedAddress;
        let deliveryCharge = 0;
        let customerPincode = '';

        if (selectedAddressId) {
            const selectedAddress = await Address.findById(selectedAddressId);
            if (selectedAddress) {
                customerPincode = selectedAddress.pinCode;
                deliveryCharge = calculateDeliveryCharge(customerPincode); 
            } else {
                console.error("Selected address not found.");
            }
        }

        const detailedCart = await Promise.all(req.session.cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product) return null;

            const offer = await Offer.findOne({ isDeleted: false, $or: [{ offerType: 'product', relatedId: product._id }, { offerType: 'category', relatedId: product.category._id }], startDate: { $lte: new Date() }, endDate: { $gte: new Date() } });
            const productImagePath = product.images.length > 0 ? `/uploads/${product.images[0].split('\\').pop().split('/').pop()}` : '/uploads/placeholder.jpg';
            let discountedPrice = product.price;

            if (offer) {
                discountedPrice = offer.discountType === 'percentage' ? product.price * (1 - offer.discountValue / 100) : product.price - offer.discountValue;
                discountedPrice = parseFloat(discountedPrice.toFixed(2));
            }

            return { ...item, name: product.name, price: product.price, discountedPrice, image: productImagePath };
        })).then(items => items.filter(item => item));

        const couponCode = null; // Reset couponCode for this session

        let totalPrice = detailedCart.reduce((total, item) => total + (item.discountedPrice * item.quantity), 0);

        let couponDiscount = 0; // Reset coupon discount
        req.session.totalPrice = totalPrice;

        const finalPrice = totalPrice + deliveryCharge;

        let errorMessage = '';
        if (req.body.paymentMethod === 'COD' && totalPrice > 1000) {
            errorMessage = 'COD is not available for orders over ₹1000.';
        }

        res.render('userSide/checkout', {
            addresses,
            cart: detailedCart,
            totalPrice: finalPrice,
            walletBalance,
            coupons,
            couponCode,
            couponDiscount,
            deliveryCharge,
            errorMessage
        });
    } catch (error) {
        console.error('Error fetching data for checkout:', error);
        res.render('userSide/checkout', {
            messages: { error: 'Error fetching data. Please try again.' },
            cart: [],
            addresses: [],
            walletBalance: 0,
            coupons: []
        });
    }
};

exports.addAddress = async (req, res) => {
    const { name, mobileNumber, city, state, pinCode } = req.body;
    const address = new Address({
        userId: req.user._id,
        name,
        mobileNumber,
        city,
        state,
        pinCode,
    });

    try {
        await address.save();
        req.session.successMessage = 'Address added successfully.';
        res.redirect('/user/checkout')
    } catch (error) {
        console.error('error adding address:',error);
        req.session.errorMessage = 'Error adding address.';
        res.status(500).json({ success: false, message: 'Error adding address.' });    }
};

exports.editAddress = async (req, res) => {
    const { name, mobileNumber, city, state, pinCode } = req.body;

    try {
        await Address.findByIdAndUpdate(req.params.id, {
            name,
            mobileNumber,
            city,
            state,
            pinCode,
        });
        req.session.successMessage = 'Address updated successfully.';
        res.redirect('/user/checkout');
    } catch (error) {
        console.error('error editing address:',error);
        req.session.errorMessage = 'Error updating address.';
        res.redirect('/user/checkout');
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const address = await Address.findByIdAndDelete(req.params.id);
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ success: false, message: "Error deleting address" });
    }
};

exports.placeOrder = async (req, res) => {
    try {
        const cart = req.session.cart || [];

        const validCartItems = await Promise.all(cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (product && product.stock > 0) {
                return {
                    ...item,
                    quantity: Math.min(item.quantity, product.stock)
                };
            }
            return null;
        }));

        const filteredValidItems = validCartItems.filter(item => item !== null);

        if (filteredValidItems.length < cart.length) {
            req.session.cart = filteredValidItems; 
            return res.render('userSide/cart', {
                cart: filteredValidItems,
                user: req.session.user,
                addresses: await Address.find({ userId: req.user._id }),
                errorMessage: 'Some products are out of stock and have been removed from your cart.'
            });
        }

        const { paymentMethod, selectedAddress, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
        const discountAmount = req.session.discountAmount || 0;
        const orderNumber = generateOrderNumber();

        if (!selectedAddress) {
            return res.status(400).json({ error: "Address selection is required for order placement." });
        }

        const address = await Address.findById(selectedAddress);
        if (!address || !address.pinCode) {
            return res.status(400).json({ error: "Valid pincode is required for order placement." });
        }

        const customerPincode = address.pinCode;
        const deliveryCharge = calculateDeliveryCharge(customerPincode);

        let orderStatus = 'Ordered';
        let paymentStatus = 'Failed'; 

        if (paymentMethod === 'Razorpay') {
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
            const generatedSignature = hmac.digest('hex');
        
            if (generatedSignature === razorpaySignature) {
                paymentStatus = 'Success';
            } else {
            }
        }

        if (!cart || cart.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or not found' });
        }

        let totalOriginalPrice = 0;
        let totalDiscountFromOffers = 0;
        let totalDiscountedPrice = 0;

        const detailedCart = await Promise.all(cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            let discountedPrice = product.price;

            const offer = await Offer.findOne({
                isDeleted: false,
                $or: [
                    { offerType: 'product', relatedId: product._id },
                    { offerType: 'category', relatedId: product.category._id }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            if (offer) {
                discountedPrice = offer.discountType === 'percentage'
                    ? product.price * (1 - offer.discountValue / 100)
                    : product.price - offer.discountValue;
                discountedPrice = parseFloat(discountedPrice.toFixed(2)) || product.price;
            }

            const itemTotalOriginalPrice = product.price * item.quantity;
            const itemTotalDiscountedPrice = discountedPrice * item.quantity;

            totalOriginalPrice += itemTotalOriginalPrice;
            totalDiscountedPrice += itemTotalDiscountedPrice;
            totalDiscountFromOffers += itemTotalOriginalPrice - itemTotalDiscountedPrice;

            return {
                ...item,
                name: product.name,
                price: product.price,
                discountedPrice,
                image: product.images[0],
                category: product.category,
                quantity: item.quantity || 1,
                itemTotalDiscountedPrice
            };
        }));

        const finalTotalPrice = totalDiscountedPrice - discountAmount + deliveryCharge;

        if (paymentMethod === 'COD' && finalTotalPrice > 1000) {
            return res.status(400);
        }

        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId: req.user._id });
            if (!wallet || wallet.balance < finalTotalPrice) {
                return res.status(400);
            }

            wallet.balance -= finalTotalPrice;
            wallet.transactions.push({
                amount: finalTotalPrice,
                type: 'debit',
                description: `Order payment for order number: ${orderNumber}`,
            });
            paymentStatus = 'Success';
            await wallet.save();
        }

        const order = new Order({
            user: req.user._id,
            orderNumber,
            cartItems: detailedCart,
            paymentMethod,
            address: {
                name: address.name,
                mobileNumber: address.mobileNumber,
                city: address.city,
                state: address.state,
                pinCode: address.pinCode,
            },
            totalPrice: finalTotalPrice,
            totalOriginalPrice,
            discount: totalDiscountFromOffers,
            couponDeduction: discountAmount,
            finalTotalPrice,
            status: orderStatus,
            paymentStatus: paymentStatus, 
        });
        await order.save();

        for (const item of cart) {
            const product = await Product.findById(item.productId);
            if (product && product.stock >= item.quantity) {
                product.stock -= item.quantity;
                product.stockStatus = product.stock <= 0 ? 'Out of Stock' : 'In Stock';
                await product.save();
            }
        }

        req.session.cart = [];
        req.session.totalPrice = 0;
        req.session.couponCode = null;
        req.session.discountAmount = 0;

        res.render('userSide/orderConfirmation', { 
            order,
            detailedCart, 
            totalOriginalPrice, 
            totalDiscountFromOffers, 
            finalTotalPrice,
            discountAmount, 
            deliveryCharge 
        });
    } catch (error) {
        console.error('Error handling order:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.placeOrderPending = async (req, res) => {
    try {
        const cart = req.session.cart || [];
        const { selectedAddress } = req.body;
        const orderNumber = generateOrderNumber();

        if (!selectedAddress) {
            return res.status(400).json({ error: "Address selection is required for order placement." });
        }

        const address = await Address.findById(selectedAddress);
        if (!address || !address.pinCode) {
            return res.status(400).json({ error: "Valid pincode is required for order placement." });
        }

        if (!cart || cart.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or not found' });
        }

        let totalOriginalPrice = 0;
        let totalDiscountFromOffers = 0;
        let totalDiscountedPrice = 0;

        const detailedCart = await Promise.all(cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            let discountedPrice = product.price;
            if (!product) {
                throw new Error(`Product not found for ID: ${item.productId}`);
            }

            const offer = await Offer.findOne({
                isDeleted: false,
                $or: [
                    { offerType: 'product', relatedId: product._id },
                    { offerType: 'category', relatedId: product.category._id }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            if (offer) {
                discountedPrice = offer.discountType === 'percentage'
                    ? product.price * (1 - offer.discountValue / 100)
                    : product.price - offer.discountValue;
                discountedPrice = parseFloat(discountedPrice.toFixed(2)) || product.price;
            }

            const itemTotalOriginalPrice = product.price * item.quantity;
            const itemTotalDiscountedPrice = discountedPrice * item.quantity;

            totalOriginalPrice += itemTotalOriginalPrice;
            totalDiscountedPrice += itemTotalDiscountedPrice;
            totalDiscountFromOffers += itemTotalOriginalPrice - itemTotalDiscountedPrice;

            return {
                ...item,
                name: product.name,
                price: product.price,
                discountedPrice,
                image: product.images[0],
                category: product.category,
                quantity: item.quantity || 1,
                itemTotalDiscountedPrice,
                status: 'Payment Pending',
            };
        }));

        const discountAmount = req.session.discountAmount || 0;
        const deliveryCharge = calculateDeliveryCharge(address.pinCode);
        const finalTotalPrice = totalDiscountedPrice - discountAmount + deliveryCharge;

        const order = new Order({
            user: req.user._id,
            orderNumber,
            cartItems: detailedCart,
            paymentMethod: 'Razorpay',
            address: {
                name: address.name,
                mobileNumber: address.mobileNumber,
                city: address.city,
                state: address.state,
                pinCode: address.pinCode,
            },
            totalPrice: finalTotalPrice,
            totalOriginalPrice,
            discount: totalDiscountFromOffers,
            couponDeduction: discountAmount,
            finalTotalPrice,
            status: 'Payment Pending',
            paymentStatus: 'Failed',
        });

        await order.save();

        req.session.cart = [];
        res.status(200).json({ message: 'Order saved with pending payment status', orderId: order._id });
    } catch (error) {
        console.error('Error handling pending order:', error);
        return res.status(500).json({ message: 'Error saving pending order' });
    }
};












