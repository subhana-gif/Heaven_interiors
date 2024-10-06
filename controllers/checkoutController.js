const Address = require('../models/Address'); 
const Product=require('../models/productModal');
const Order=require('../models/order')

exports.getCheckoutPage = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.redirect('/user_login'); // Redirect to login if user is not authenticated
        }

        // Ensure the cart is initialized in the session
        if (!req.session.cart) {
            req.session.cart = []; // Initialize if it doesn't exist
        }

        // Fetch user addresses
        const addresses = await Address.find({ userId: req.user._id });

        // Populate detailed cart with product information
        const detailedCart = await Promise.all(req.session.cart.map(async (item) => {
            const product = await Product.findById(item.productId);
            const productImagePath = product.images.length > 0 ? `/uploads/${product.images[0].split('\\').pop().split('/').pop()}` : '/uploads/placeholder.jpg';
            return {
                ...item,
                name: product.name,
                price: product.price,
                image: productImagePath
            };
        })).then(items => items.filter(item => item)); // Filter out invalid products

        // Render the checkout page with the retrieved addresses and cart
        res.render('userSide/checkout', { 
            addresses, 
            cart: detailedCart 
        }); 
    } catch (error) {
        console.error('Error fetching data for checkout:', error);
        res.render('userSide/checkout', { 
            messages: { error: 'Error fetching data. Please try again.' },
            cart: [], // Pass an empty cart in case of error
            addresses: [] // Pass an empty addresses list in case of error
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
        const { paymentMethod, selectedAddress  } = req.body; // Extract paymentMethod and address from the request body


        const address = await Address.findById(selectedAddress);
        if (!address) {
            return res.status(400).json({ message: 'Address not found' });
        }
        // Check if the cart is empty
        if (!cart || cart.length === 0) {
            return res.status(400).json({ message: 'Cart is empty or not found' });
        }

        // Create a new order
        const order = new Order({
            user: req.user._id,
            cartItems: cart,
            paymentMethod,
            address,
            totalPrice: cart.reduce((total, item) => total + item.price * item.quantity, 0), // Calculate total price
        });

        // Save the order to the database
        await order.save();

        for (const item of cart) {
            const product = await Product.findById(item.productId); // Assuming item has productId
            if (product) {
                console.log(`Current stock of product ${product.name}: ${product.stock}`);

                if (product.stock >= item.quantity) { // Check if sufficient stock
                    product.stock -= item.quantity; // Decrease stock
                    
                    if (product.stock <= 0) {
                        product.stock = 0; // Ensure stock doesn't go negative
                        product.stockStatus = 'Out of Stock'; // Set status to out of stock
                    } else {
                        product.stockStatus = 'In Stock'; // Set status to in stock if stock is greater than zero
                    }
                    await product.save(); // Save the updated product
                    console.log(`Updated stock of product ${product.name}: ${product.stock}`);
                } else {
                    console.log(`Not enough stock for product ${product.name}.`);
                }
            } else {
                console.log(`Product with ID ${item.productId} not found.`);
            }
        }
        
        
        req.session.cart = []; // Empty the cart in session

        console.log(order); // Debugging line
        res.render('userSide/orderConfirmation', { order });
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ message: 'Error placing order' });
    }
};
