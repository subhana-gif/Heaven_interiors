const Address = require('../models/Address'); 
const Product=require('../models/productModal');
const Order=require('../models/order')
const Coupon = require('../models/coupon')
const User = require('../models/User')
const Offer = require('../models/offer')
const Wallet = require('../models/wallet')
require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const { v4: uuidv4 } = require('uuid');

exports.createOrder = async (req, res) => {
    const { selectedAddress } = req.body;
    const cart = req.session.cart || [];

    if (!cart || cart.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
    }

    const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);

    // Create an order in Razorpay
    const options = {
        amount: totalPrice * 100, // Amount in paisa (INR)
        currency: "INR",
        receipt: `receipt_order_${new Date().getTime()}` // Unique receipt ID
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json({ 
            orderId: order.id, 
            amount: order.amount, 
            currency: order.currency, 
            key: process.env.RAZORPAY_KEY_ID // Pass Razorpay key to the client
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
        const coupons = await Coupon.find({ expirationDate: { $gte: Date.now() } });
        // Fetch wallet information
        const wallet = await Wallet.findOne({ userId: req.user._id });
        const walletBalance = wallet ? wallet.balance : 0; 

        // Fetch user addresses
        const addresses = await Address.find({ userId: req.user._id });

        // Populate cart details
        const detailedCart = await Promise.all(req.session.cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product) return null; // Handle cases where product is not found
            const offer = await Offer.findOne({
                $or: [
                    { offerType: 'product', relatedId: product._id },
                    { offerType: 'category', relatedId: product.category._id }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });
            const productImagePath = product.images.length > 0 ? `/uploads/${product.images[0].split('\\').pop().split('/').pop()}` : '/uploads/placeholder.jpg';
            let discountedPrice = product.price;

            if (offer) {
                discountedPrice = offer.discountType === 'percentage'
                    ? product.price * (1 - offer.discountValue / 100)
                    : product.price - offer.discountValue;

                discountedPrice = parseFloat(discountedPrice.toFixed(2));
                
            }
            return {
                ...item,
                name: product.name,
                price: product.price,
                discountedPrice,
                image: productImagePath
            };
        })).then(items => items.filter(item => item)); 


        const couponCode = req.session.couponCode || null;
        

        let totalPrice = detailedCart.reduce((total, item) => total + (item.discountedPrice * item.quantity), 0);        
        req.session.totalPrice = totalPrice; 
        // You might want to ensure the final total price doesn't go below zero
                
        // Render checkout page with data
        res.render('userSide/checkout', { 
            addresses, 
            cart: detailedCart,
            totalPrice,
            walletBalance,
            coupons,
            couponCode,
            
        }); 
    } catch (error) {
        console.error('Error fetching data for checkout:', error);
        res.render('userSide/checkout', { 
            messages: { error: 'Error fetching data. Please try again.' },
            cart: [], 
            addresses: [],
            walletBalance: 0 ,
            coupons:[]
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
        console.error(error);
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
        console.error(error);
        req.session.errorMessage = 'Error updating address.';
        res.redirect('/user/checkout');
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        await Address.findByIdAndDelete(req.params.id);
        req.session.successMessage = 'Address deleted successfully.';
        res.redirect('/user/checkout');
    } catch (error) {
        console.error(error);
        req.session.errorMessage = 'Error deleting address.';
        res.redirect('/user/checkout');
    }
};

exports.placeOrder = async (req, res) => {
    try {
        const cart = req.session.cart || [];
        const { paymentMethod, selectedAddress, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
        const couponCode = req.session.couponCode || null;
        const discountAmount = req.session.discountAmount || 0;
        const orderNumber = uuidv4();

        // Step 1: Verify Razorpay payment
        if (paymentMethod === 'Razorpay') {
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
            const generatedSignature = hmac.digest('hex');
            
            if (generatedSignature !== razorpaySignature) {
                return res.status(400).json({ message: 'Razorpay payment verification failed' });
            }
        }

        // Step 2: Find the address
        const address = await Address.findById(selectedAddress);
        if (!address) {
            return res.status(400).json({ message: 'Address not found' });
        }

        // Step 3: Validate the cart
        if (!cart || cart.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or not found' });
        }

        // Step 4: Create the order
        let totalOriginalPrice = 0;
        let totalDiscountFromOffers = 0;
        let totalDiscountedPrice = 0;

        const detailedCart = await Promise.all(cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            let discountedPrice = product.price;
            
            // Apply offer if available
            const offer = await Offer.findOne({
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
                quantity: item.quantity || 1,
                itemTotalDiscountedPrice 
            };
        }));

        // Calculate final total price with coupon discount
        const finalTotalPrice = totalDiscountedPrice - discountAmount;
        
        // Step 5: Create the order
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
            discount:totalDiscountFromOffers,
            couponDeduction: discountAmount,
            finalTotalPrice,
            status: 'Ordered'
        });

        await order.save();


        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId: req.user._id });
            if (!wallet || wallet.balance < finalTotalPrice) {
                return res.status(400).json({ message: 'Insufficient wallet balance' });
            }

            // Deduct from wallet and create a transaction record
            wallet.balance -= finalTotalPrice;
            wallet.transactions.push({
                amount: finalTotalPrice,
                type: 'debit',
                description: 'Order payment for order ID: ', // Add relevant description
                orderId: null, // Will update later with the order ID
            });
            await wallet.save();
        }
        
        // Step 5: Update product stock
        for (const item of cart) {
            const product = await Product.findById(item.productId);
            if (product && product.stock >= item.quantity) {
                product.stock -= item.quantity;
                product.stockStatus = product.stock <= 0 ? 'Out of Stock' : 'In Stock';
                await product.save();
            }
        }

        // Step 6: Clear the cart and send order confirmation
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
         });

    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ message: 'Error placing order' });
    }
};


