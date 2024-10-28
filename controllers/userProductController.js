const Product = require('../models/productModal');
const Category = require('../models/category');
const User = require('../models/User')
const Wishlist = require('../models/wishlist')
const Offer = require('../models/offer')


exports.renderUserProductPage = async (req, res) => {
    try {
        const categoryName = req.query.category;
        let products;
        const categories = await Category.find()

        if (categoryName) {
            const category = await Category.findOne({ name: categoryName, status: 'active' });
            products = category ? await Product.find({ category: category._id, isDelete: false }) : [];
        } else {
            const activeCategories = await Category.find({ status: 'active' }).select('_id');
            products = await Product.find({ category: { $in: activeCategories }, isDelete: false });
        }

        for (const product of products) {
            const offer = await Offer.findOne({
                $or: [
                    { offerType: 'product', relatedId: product._id },
                    { offerType: 'category', relatedId: product.category._id }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            if (offer) {
                product.discountedPrice = offer.discountType === 'percentage'
                    ? product.price * (1 - offer.discountValue / 100)
                    : product.price - offer.discountValue;

                product.discountedPrice = product.discountedPrice.toFixed(2); // Format to two decimal places
            } else {
                product.discountedPrice = null; // No discount available
            }
        }

        const userId = req.session.user?._id
        const user = req.session.user ? await User.findById(req.session.user).lean() : null;
        let wishlist = [];

        
        if (userId) {
            const userWishlist = await Wishlist.findOne({ userId });
            
            if (userWishlist && userWishlist.products) {
                wishlist = userWishlist.products.map(p => p.toString());  // Convert ObjectIds to strings for easier comparison
            }
        }
        
        res.render('userSide/shop', { products, user, isAuthenticated: !!req.session.user,  wishlist: wishlist, categories   });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.filterProducts = async (req, res) => {
    const { selectedCategories, sort } = req.body;
    const categoryFilter = selectedCategories && selectedCategories.length > 0
        ? { category: { $in: selectedCategories } }
        : {}; // Show all products if no category is selected

    try {
        let products = await Product.find(categoryFilter).populate('category')
        .select('name description price stockStatus stock images category');



        for (const product of products) {
            const offer = await Offer.findOne({
                $or: [
                    { offerType: 'product', relatedId: product._id },
                    { offerType: 'category', relatedId: product.category._id }
                ],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });
    
            if (offer) {
                product.discountedPrice = offer.discountType === 'percentage'
                    ? product.price * (1 - offer.discountValue / 100)
                    : product.price - offer.discountValue;
                product.discountedPrice = parseFloat(product.discountedPrice.toFixed(2)); // Format to two decimal places
            } else {
                product.discountedPrice = null; // No discount available
            }
        }
        
        // Sorting logic
        switch (sort) {
            case 'popularity':
                products = products.sort((a, b) => b.popularity - a.popularity);
                break;
            case 'priceLowToHigh':
                products = products.sort((a, b) => a.price - b.price);
                break;
            case 'priceHighToLow':
                products = products.sort((a, b) => b.price - a.price);
                break;
            case 'newArrivals':
                products = products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            default:
                break;
        }

        res.json({ products });
    } catch (error) {
        console.error('Error filtering products:', error);
        res.status(500).send('Server Error');
    }
};

exports.viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category');
        const selectedAddressId = req.session.selectedAddressId || null;
        const offer = await Offer.findOne({
            $or: [
                { offerType: 'product', relatedId: product._id },
                { offerType: 'category', relatedId: product.category._id }
            ],
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });
        
        let discountedPrice = null;
        if (offer) {
            discountedPrice = offer.discountType === 'percentage'
                ? product.price * (1 - offer.discountValue / 100)
                : product.price - offer.discountValue;
        }
                
        if (!product || product.isDelete || (product.category && product.category.status !== 'active')) {
            return res.status(404).send('Product not found');
        }
        const source = req.query.source || 'shop'; 
        const relatedProducts = await Product.find({
            _id: { $ne: product._id },
            category: product.category
        }).limit(4); 
        

        res.render('userSide/viewProduct', {
            product,
            relatedProducts,
            source,
            selectedAddressId,
            user: req.session.user || null,
            offers: offer ? [offer] : [],
            originalPrice: product.price,
            discountedPrice: discountedPrice ? discountedPrice.toFixed(2) : null
        });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(404).send('Product not found');
    }
};

exports.getProducts = async () => {
    try {
        return await Product.find();
    } catch (error) {
        throw new Error('Error fetching products');
    }
};
