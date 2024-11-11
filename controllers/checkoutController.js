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
    const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000); // Generates a random 10-digit number
    return `${prefix}${randomNumber}`;
}

exports.getDeliveryCharge = async (req, res) => {
    try {
        const address = await Address.findById(req.params.addressId);
        if (address && address.pinCode) {
            const deliveryCharge = calculateDeliveryCharge(address.pinCode);
            const cartTotal = req.session.totalPrice || 0; // Ensure this is set in the session
            
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
        // Step 1: Calculate discounted subtotal based on item prices and quantities
        let subtotal = 0;
        for (const item of cart) {
            const productFromDb = await Product.findById(item.productId);
            if (!productFromDb) {
                return res.status(404).json({ message: 'Product not found' });
            }

            // Check for an active offer or fallback to discounted price if available
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
            console.log('unit price',unitPrice);
            
            subtotal += unitPrice * item.quantity;
        }

        // Step 2: Apply coupon deduction if a valid coupon is provided
        const couponCode = req.session.couponCode || null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, isDeleted: false, isActive: true, expirationDate: { $gte: Date.now() } });
            if (coupon) {
                if (coupon.discountType === 'percentage') {
                    subtotal *= (1 - coupon.discountValue / 100);
                } else if (coupon.discountType === 'fixed') {
                    subtotal -= coupon.discountValue;
                }
                subtotal = Math.max(subtotal, 0); //
            }
        }
        

        // Step 3: Add delivery charges (example: fixed delivery charge)
        const address = await Address.findById(selectedAddress);
        const deliveryCharge = calculateDeliveryCharge(address.pinCode)
        console.log('delivery charge:',deliveryCharge);
        

        // Step 4: Calculate final total after applying discounts and adding delivery charge
        const finalAmount = subtotal  + deliveryCharge;
        console.log('final:',finalAmount);
        console.log('subtotal:',subtotal);
        
        
        // Create an order in Razorpay with the final amount in paisa (INR)
        const options = {
            amount: Math.round(finalAmount * 100), // Convert to paisa
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}` // Unique receipt ID
        };

        const order = await razorpay.orders.create(options);

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID, // Pass Razorpay key to client
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

        // Initialize the cart if it doesn't exist
        if (!req.session.cart) {
            req.session.cart = [];
        }

        // Fetch active coupons and wallet balance
        const coupons = await Coupon.find({ isDeleted: false, isActive: true, expirationDate: { $gte: Date.now() } });
        const wallet = await Wallet.findOne({ userId: req.user._id });
        const walletBalance = wallet ? wallet.balance : 0;

        // Fetch user addresses
        const addresses = await Address.find({ userId: req.user._id });

        // Get selected address from request body, if available
        const selectedAddressId = req.body.selectedAddress; // Adjust this line based on how you are submitting the form
        let deliveryCharge = 0; // Default delivery charge
        let customerPincode = ''; // Default pincode

        if (selectedAddressId) {
            const selectedAddress = await Address.findById(selectedAddressId);
            if (selectedAddress) {
                customerPincode = selectedAddress.pinCode; // Use the pin code from the selected address
                deliveryCharge = calculateDeliveryCharge(customerPincode); // Calculate delivery charge based on the pin code
            } else {
                console.error("Selected address not found.");
            }
        }

        // Fetch detailed cart items
        const detailedCart = await Promise.all(req.session.cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product) return null;

            const offer = await Offer.findOne({ isDeleted: false, $or: [{ offerType: 'product', relatedId: product._id }, { offerType: 'category', relatedId: product.category._id }], startDate: { $lte: new Date() }, endDate: { $gte: new Date() } });
            const productImagePath = product.images.length > 0 ? `/uploads/${product.images[0].split('\\').pop().split('/').pop()}` : '/uploads/placeholder.jpg';
            let discountedPrice = product.price;

            // Apply offer discounts if available
            if (offer) {
                discountedPrice = offer.discountType === 'percentage' ? product.price * (1 - offer.discountValue / 100) : product.price - offer.discountValue;
                discountedPrice = parseFloat(discountedPrice.toFixed(2));
            }

            return { ...item, name: product.name, price: product.price, discountedPrice, image: productImagePath };
        })).then(items => items.filter(item => item));

        const couponCode = req.session.couponCode || null;

        // Calculate the total price before any coupon deduction
        let totalPrice = detailedCart.reduce((total, item) => total + (item.discountedPrice * item.quantity), 0);

        // Check for the coupon and apply discount
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, isDeleted: false, isActive: true, expirationDate: { $gte: Date.now() } });
            if (coupon) {
                if (coupon.discountType === 'percentage') {
                    totalPrice *= (1 - coupon.discountValue / 100);
                } else if (coupon.discountType === 'fixed') {
                    totalPrice -= coupon.discountValue;
                }
                totalPrice = Math.max(totalPrice, 0); // Ensure total price doesn't go negative
                req.session.appliedCoupon = couponCode; // Store applied coupon code in session
            }
        }

        req.session.totalPrice = totalPrice;

        // Calculate final price including delivery charge
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

        // Validate cart items
        const validCartItems = await Promise.all(cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (product && product.stock > 0) {
                return {
                    ...item,
                    quantity: Math.min(item.quantity, product.stock) // Use available stock
                };
            }
            return null; // Invalid item
        }));

        const filteredValidItems = validCartItems.filter(item => item !== null);

        // If there are invalid items, return to cart with an error message
        if (filteredValidItems.length < cart.length) {
            req.session.cart = filteredValidItems; // Update session cart
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

        let orderStatus = 'Ordered'; // Default status
        let paymentStatus = 'Failed'; // Default payment status

        if (paymentMethod === 'Razorpay') {
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
            const generatedSignature = hmac.digest('hex');
        
            if (generatedSignature === razorpaySignature) {
                paymentStatus = 'Success'; // Payment was successful
            } else {
                console.log('Razorpay payment verification failed');
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

        // Check for COD limit
        if (paymentMethod === 'COD' && finalTotalPrice > 1000) {
            return res.status(400);
        }

        // Handle wallet payment if selected
        if (paymentMethod === 'Wallet') {
            const wallet = await Wallet.findOne({ userId: req.user._id });
            if (!wallet || wallet.balance < finalTotalPrice) {
                console.log('Insufficient wallet balance');
                return res.status(400);
            }

            // Deduct balance from wallet and add transaction only if sufficient
            wallet.balance -= finalTotalPrice;
            wallet.transactions.push({
                amount: finalTotalPrice,
                type: 'debit',
                description: `Order payment for order number: ${orderNumber}`,
            });
            paymentStatus = 'Success';
            await wallet.save();
        }

        // Create the order after payment verification
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

        // Clear session data after order completion
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
            console.log('No address selected');
            return res.status(400).json({ error: "Address selection is required for order placement." });
        }

        const address = await Address.findById(selectedAddress);
        if (!address || !address.pinCode) {
            console.log('Address validation failed');
            return res.status(400).json({ error: "Valid pincode is required for order placement." });
        }

        if (!cart || cart.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or not found' });
        }

        let totalOriginalPrice = 0;
        let totalDiscountFromOffers = 0;
        let totalDiscountedPrice = 0;

        // Process cart items and apply discounts
        const detailedCart = await Promise.all(cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            let discountedPrice = product.price;
            if (!product) {
                console.log(`Product not found: ${item.productId}`);
                throw new Error(`Product not found for ID: ${item.productId}`);
            }

            // Find any valid offers for the product
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

            // Return the detailed cart item
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

        // Create the order with payment status as 'Failed' and status as 'Payment Pending'
        const order = new Order({
            user: req.user._id,
            orderNumber,
            cartItems: detailedCart, // Use the detailed cart with updated statuses
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

        // Save the order
        await order.save();

        req.session.cart = [];
        console.log('Order saved with pending status:', order._id);
        res.status(200).json({ message: 'Order saved with pending payment status', orderId: order._id });
    } catch (error) {
        console.error('Error handling pending order:', error);
        return res.status(500).json({ message: 'Error saving pending order' });
    }
};












