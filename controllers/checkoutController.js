const Address = require('../models/Address'); 
const Product=require('../models/productModal');
const Order=require('../models/order')

exports.getCheckoutPage = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/user_login');
        }
        if (!req.session.cart) {
            req.session.cart = [];
        }
        const addresses = await Address.find({ userId: req.user._id });
        const detailedCart = await Promise.all(req.session.cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            const productImagePath = product.images.length > 0 ? `/uploads/${product.images[0].split('\\').pop().split('/').pop()}` : '/uploads/placeholder.jpg';
            return {
                ...item,
                name: product.name,
                price: product.price,
                image: productImagePath
            };
        })).then(items => items.filter(item => item)); 
        res.render('userSide/checkout', { 
            addresses, 
            cart: detailedCart 
        }); 
    } catch (error) {
        console.error('Error fetching data for checkout:', error);
        res.render('userSide/checkout', { 
            messages: { error: 'Error fetching data. Please try again.' },
            cart: [], 
            addresses: [] 
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
        const { paymentMethod, selectedAddress  } = req.body; 


        const address = await Address.findById(selectedAddress);
        if (!address) {
            return res.status(400).json({ message: 'Address not found' });
        }
        if (!cart || cart.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or not found' });
        }

        const order = new Order({
            user: req.user._id,
            cartItems: cart,
            paymentMethod,
            address,
            totalPrice: cart.reduce((total, item) => total + item.price * item.quantity, 0),
        });

        await order.save();

        for (const item of cart) {
            const product = await Product.findById(item.productId);
            if (product) {
                console.log(`Current stock of product ${product.name}: ${product.stock}`);

                if (product.stock >= item.quantity) {
                    product.stock -= item.quantity;
                    if (product.stock <= 0) {
                        product.stock = 0;
                        product.stockStatus = 'Out of Stock'; 
                    } else {
                        product.stockStatus = 'In Stock';
                    }
                    await product.save();
                    console.log(`Updated stock of product ${product.name}: ${product.stock}`);
                } else {
                    console.log(`Not enough stock for product ${product.name}.`);
                }
            } else {
                console.log(`Product with ID ${item.productId} not found.`);
            }
        }
        
        req.session.cart = [];
        
        console.log(order); 
        res.render('userSide/orderConfirmation', { order });
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ message: 'Error placing order' });
    }
};
