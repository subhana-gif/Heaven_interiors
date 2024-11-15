const Product = require('../models/productModal');
const Address=require('../models/Address')
const Cart=require('../models/cart')
const Offer = require('../models/offer')

exports.addToCart = async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/user/user_login'); 
        }
        const productId = req.params.id;
        const quantity = req.body.quantity || 1;
        let cart = req.session.cart || [];
        let outOfStockItems = [];

        const pageSize = 5;
        const currentPage = parseInt(req.query.page) || 1; 
        const totalItems = cart.length; 
        const totalPages = Math.ceil(totalItems / pageSize); 

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const paginatedCart = cart.slice(startIndex, endIndex);

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        const stockLeft = product.stock;
        const detailedCart = await Promise.all(paginatedCart.map(async (item) => {
            const product = await Product.findById(item.productId); 
          
            if (product.stock < item.quantity) {
                item.quantity = product.stock; 
            }
            if (product.stock === 0) {
                outOfStockItems.push(product.name);
            }


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
                image: productImagePath,
            };
        }));
        const totalPrice = detailedCart.reduce((total, item) => {
            return total + ((item.discountedPrice ? item.discountedPrice : item.price) * item.quantity);
        }, 0);

        const existingProductIndex = cart.findIndex(item => item.productId === productId);
        if (existingProductIndex >= 0) {
            const currentQuantity = cart[existingProductIndex].quantity;
            const newQuantity = currentQuantity + quantity;

            if (newQuantity <= stockLeft && newQuantity <= 5) {
                cart[existingProductIndex].quantity = newQuantity;
            }else {
                return res.render('userSide/cart', {
                    currentPage, 
                    totalPages,         
                    cart:detailedCart,
                    totalPrice,
                    errorMessage: 'Cannot add more than available stock or maximum limit of 5'
                });
            }
        } else {
            if (quantity <= stockLeft && quantity <= 5) {
                cart.push({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.images[0] || 'placeholder.jpg',
                    category: product.category, 
                    quantity: quantity,
                });
            }
        }

        req.session.cart = cart; 

        await Cart.findOneAndUpdate(
            { userId: req.user._id }, 
            { items: cart }, 
            { upsert: true } 
        );

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
        const productFromDb = await Product.findById(productId);
        if (!productFromDb) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        const offer = await Offer.findOne({
            $or: [
                { offerType: 'product', relatedId: productFromDb._id },
                { offerType: 'category', relatedId: productFromDb.category }
            ],
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        let unitPrice = productFromDb.price;
        if (offer) {
            unitPrice = offer.discountType === 'percentage'
                ? productFromDb.price * (1 - offer.discountValue / 100)
                : productFromDb.price - offer.discountValue;
            unitPrice = parseFloat(unitPrice.toFixed(2));
        } else if (productFromDb.discountedPrice) {
            unitPrice = productFromDb.discountedPrice;
        }

        const stockLeft = productFromDb.stock;
        const productInCart = cart.find(item => item.productId.toString() === productId);

        if (productInCart) {
            if (action === 'increase') {
                if (productInCart.quantity < stockLeft && productInCart.quantity < 5) {
                    productInCart.quantity += 1;
                } else {
                    return res.json({
                        errorMessage: 'Cannot add more than available stock or maximum limit of 5',
                        newQuantity: productInCart.quantity,
                        stock: stockLeft
                    });
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

        await Cart.findOneAndUpdate(
            { userId: req.user._id },
            { items: cart },
            { upsert: true }
        );

        const cartTotalPrice = await Promise.all(
            cart.map(async item => {
                const product = await Product.findById(item.productId);
                const itemOffer = await Offer.findOne({
                    $or: [
                        { offerType: 'product', relatedId: product._id },
                        { offerType: 'category', relatedId: product.category }
                    ],
                    startDate: { $lte: new Date() },
                    endDate: { $gte: new Date() }
                });

                let itemPrice = product.price;
                if (itemOffer) {
                    itemPrice = itemOffer.discountType === 'percentage'
                        ? product.price * (1 - itemOffer.discountValue / 100)
                        : product.price - itemOffer.discountValue;
                    itemPrice = parseFloat(itemPrice.toFixed(2));
                } else if (product.discountedPrice) {
                    itemPrice = product.discountedPrice;
                }
                return itemPrice * item.quantity;
            })
        ).then(prices => prices.reduce((total, price) => total + price, 0));

        const updatedQuantity = productInCart ? productInCart.quantity : 1;

        res.json({
            newQuantity: updatedQuantity,
            stock: stockLeft,
            itemTotalPrice: updatedQuantity * unitPrice,
            cartTotalPrice: parseFloat(cartTotalPrice.toFixed(2)) 
        });

    } catch (error) {
        console.error('error updating cart:',error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.removeFromCart = async(req, res) => {
    try{
    const productId = req.params.id;
    let cart = req.session.cart || [];

    cart = cart.filter(item => item.productId !== productId);
    req.session.cart = cart.filter(item => item.productId !== productId);
    await Cart.findOneAndUpdate(
        { userId: req.user._id },
        { items: cart },
        { upsert: true }
    );
    
    res.redirect('/user/cart');
} catch (error) {
    console.error('error removing from cart:',error);
    res.status(500).send('Server error');
}
};

exports.renderCart = async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/user/user_login');
    }

    try {
        let cart = req.session.cart;

        if (!cart) {
            const userCart = await Cart.findOne({ userId: req.user._id });
            cart = userCart ? userCart.items : [];
            req.session.cart = cart;
        }

        const pageSize = 5;
        const currentPage = parseInt(req.query.page) || 1;
        const totalItems = cart.length;
        const totalPages = Math.ceil(totalItems / pageSize); 

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const paginatedCart = cart.slice(startIndex, endIndex);

        let outOfStockItems = [];
        const detailedCart = await Promise.all(paginatedCart.map(async (item) => {
            const product = await Product.findById(item.productId); 
          
            if (product.stock < item.quantity) {
                item.quantity = product.stock;
            }
            if (product.stock === 0) {
                outOfStockItems.push(product.name); 
            }


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
                image: productImagePath,
            };
        }));

        const addresses = await Address.find({ userId: req.user._id });

        const totalPrice = detailedCart.reduce((total, item) => {
            return total + ((item.discountedPrice ? item.discountedPrice : item.price) * item.quantity);
        }, 0);

        let errorMessage = '';
        if (outOfStockItems.length > 0) {
            errorMessage = 'Some products are out of stock Please Remove it from your cart.';
        }

        res.render('userSide/cart', {
            cart: detailedCart,
            totalPrice,
            user: req.session.user,
            addresses,
            currentPage,
            errorMessage,
            totalPages
        });
    } catch (error) {
        console.error('error rendering cart:',error);
        res.status(500).send('Server error');
    }
};


