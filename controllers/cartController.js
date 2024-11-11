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

        const pageSize = 5; // Items per page
        const currentPage = parseInt(req.query.page) || 1; // Current page from query or default to 1
        const totalItems = cart.length; // Total items in cart
        const totalPages = Math.ceil(totalItems / pageSize); // Total number of pages

        // Calculate start and end indexes for pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const paginatedCart = cart.slice(startIndex, endIndex); // Get the items for the current page


        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        const stockLeft = product.stock;
        const detailedCart = await Promise.all(paginatedCart.map(async (item) => {
            const product = await Product.findById(item.productId); 
          
            if (product.stock < item.quantity) {
                item.quantity = product.stock; // Update to available stock level
            }
            if (product.stock === 0) {
                outOfStockItems.push(product.name); // Add out of stock product name to the array
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
                    currentPage, // Pass current page to the template
                    totalPages, // Pass total pages to the template        
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
            { upsert: true } // Create document if it doesn't exist
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

        // Fetch any applicable offer for the product
        const offer = await Offer.findOne({
            $or: [
                { offerType: 'product', relatedId: productFromDb._id },
                { offerType: 'category', relatedId: productFromDb.category }
            ],
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        // Calculate the unit price with discount if offer exists
        let unitPrice = productFromDb.price;
        if (offer) {
            unitPrice = offer.discountType === 'percentage'
                ? productFromDb.price * (1 - offer.discountValue / 100)
                : productFromDb.price - offer.discountValue;
            unitPrice = parseFloat(unitPrice.toFixed(2)); // Format to two decimal places
        } else if (productFromDb.discountedPrice) {
            // Fallback to product's existing discountedPrice if no offer is active
            unitPrice = productFromDb.discountedPrice;
        }

        const stockLeft = productFromDb.stock;
        const productInCart = cart.find(item => item.productId.toString() === productId);

        // Adjust quantity based on the action (increase or decrease)
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
            // Add the product if not already in cart, respecting stock limits
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
            itemTotalPrice: updatedQuantity * unitPrice, // total for the updated item
            cartTotalPrice: parseFloat(cartTotalPrice.toFixed(2)) // total for the entire cart
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.removeFromCart = async(req, res) => {
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
};

exports.renderCart = async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/user/user_login');
    }

    try {
        let cart = req.session.cart;

        // Load from database if not in session
        if (!cart) {
            const userCart = await Cart.findOne({ userId: req.user._id });
            cart = userCart ? userCart.items : [];
            req.session.cart = cart; // Save to session for further use
        }

        // Pagination logic
        const pageSize = 5; // Items per page
        const currentPage = parseInt(req.query.page) || 1; // Current page from query or default to 1
        const totalItems = cart.length; // Total items in cart
        const totalPages = Math.ceil(totalItems / pageSize); // Total number of pages

        // Calculate start and end indexes for pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const paginatedCart = cart.slice(startIndex, endIndex); // Get the items for the current page

        let outOfStockItems = [];
        // Map through the paginated cart items to get detailed information
        const detailedCart = await Promise.all(paginatedCart.map(async (item) => {
            const product = await Product.findById(item.productId); 
          
            if (product.stock < item.quantity) {
                item.quantity = product.stock; // Update to available stock level
            }
            if (product.stock === 0) {
                outOfStockItems.push(product.name); // Add out of stock product name to the array
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

        // Render the cart page with pagination data
        res.render('userSide/cart', {
            cart: detailedCart,
            totalPrice,
            user: req.session.user,
            addresses,
            currentPage,
            errorMessage,
            totalPages // Pass total pages to the template
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};


