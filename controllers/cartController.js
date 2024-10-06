const Product = require('../models/productModal');
const Address=require('../models/Address')
const Cart=require('../models/cart')

exports.addToCart = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/user/user_login'); 
        }
        const productId = req.params.id;
        const quantity = req.body.quantity || 1;
        let cart = req.session.cart || [];

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        const existingProductIndex = cart.findIndex(item => item.productId === productId);
        if (existingProductIndex >= 0) {
            cart[existingProductIndex].quantity += quantity;
        } else {
            cart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.images[0] || 'placeholder.jpg',
                quantity: quantity
            });
        }

        req.session.cart = cart; // Save the updated cart in the session

        // Save cart to database
        await Cart.findOneAndUpdate(
            { userId: req.user._id }, // Find cart for this user
            { items: cart }, // Update items
            { upsert: true, new: true } // Create if it doesn't exist
        );

        console.log("Cart after adding product:", req.session.cart);
        res.redirect('/user/cart');
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).send('Internal Server Error');
    }
};




exports.updateCart = async (req, res) => {
    const productId = req.params.id;
    const action = req.body.action;
    let cart = req.session.cart || [];

    try {
        const productFromDb = await Product.findById(productId); //  you're using Mongoose

        if (!productFromDb) {
            req.send('error', 'Product not found.');
            return res.redirect('/user/cart');
        }

        const stockLeft = productFromDb.stock; 

        const productInCart = cart.find(item => item.productId === productId);

        if (productInCart) {
            if (action === 'increase') {

                if (productInCart.quantity < stockLeft && productInCart.quantity < 5) { 
                    productInCart.quantity += 1;
                } 
            } else if (action === 'decrease' && productInCart.quantity > 1) {
                productInCart.quantity -= 1;
            }
        } else {
            if (stockLeft > 0) {
                cart.push({ productId: productId, quantity: 1 });
            } 
        }

        req.session.cart = cart;
        res.redirect('/user/cart');
    } catch (error) {
        console.error(error);
        // res.send('error', 'An error occurred while updating the cart.');
        res.redirect('/user/cart');
    }
};


// Remove from Cart
exports.removeFromCart = (req, res) => {
    const productId = req.params.id;
    let cart = req.session.cart || [];

    req.session.cart = cart.filter(item => item.productId !== productId);
    res.redirect('/user/cart');
};

exports.renderCart =async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/user/user_login')
    }

    try{
    const cart = req.session.cart || [];
    const detailedCart =await Promise.all( cart.map(async (item) => {
        const product = await Product.findById(item.productId); 
        const productImagePath = product.images.length > 0 ? `/uploads/${product.images[0].split('\\').pop().split('/').pop()}` : '/uploads/placeholder.jpg';
        return {
            ...item,
            name: product.name,
            price: product.price,
            image:productImagePath
        };
    }));
    console.log("Detailed Cart:", detailedCart);
    const addresses = await Address.find({ userId: req.user._id });
    res.render('userSide/cart', { cart: detailedCart, user: req.session.user,addresses });
    }catch(error){
        console.error(error);
        res.status(500).send('Server error')
    }
};
