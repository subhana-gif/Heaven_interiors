const Product = require('../models/productModal');
const Category = require('../models/category');
const User = require('../models/User')
const Wishlist = require('../models/wishlist')
const Offer = require('../models/offer')

exports.renderUserProductPage = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const categoryName = req.query.category; 
    let products, totalProducts;

    try {
        const categories = await Category.find({ status: 'active', isDelete: false });

        if (categoryName) {
            const category = await Category.findOne({ name: categoryName, status: 'active' });
            if (category) {
                totalProducts = await Product.countDocuments({ category: category._id, isDelete: false });
                products = await Product.find({ category: category._id, isDelete: false })
                    .skip(skip)
                    .limit(limit);
            } else {
                totalProducts = 0;
                products = [];
            }
        } else {
            const activeCategories = await Category.find({ status: 'active', isDelete: false }).select('_id');
            totalProducts = await Product.countDocuments({ category: { $in: activeCategories }, isDelete: false });
            products = await Product.find({ category: { $in: activeCategories }, isDelete: false })
                .skip(skip)
                .limit(limit);
        }

        for (const product of products) {
            const offer = await Offer.findOne({
                isDeleted: false,
                $or: [{ offerType: 'product', relatedId: product._id }, { offerType: 'category', relatedId: product.category._id }],
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            if (offer) {
                product.discountedPrice = offer.discountType === 'percentage'
                    ? product.price * (1 - offer.discountValue / 100)
                    : product.price - offer.discountValue;

                product.discountedPrice = product.discountedPrice.toFixed(2);
            } else {
                product.discountedPrice = null;
            }
        }

        const userId = req.session.user?._id;
        const user = req.session.user ? await User.findById(req.session.user).lean() : null;
        let wishlist = [];

        if (userId) {
            const userWishlist = await Wishlist.findOne({ userId });
            if (userWishlist && userWishlist.products) {
                wishlist = userWishlist.products.map(p => p.toString());
            }
        }

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('userSide/shop', {
            products,
            user,
            totalPages,
            currentPage: page,
            isAuthenticated: !!req.session.user,
            wishlist,
            categories,
            categoryName 
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.filterProducts = async (req, res) => {
    const { selectedCategories, sort, page = 1 } = req.body;
    const limit = 9;
    const skip = (page - 1) * limit;

    const categoryFilter = selectedCategories && selectedCategories.length > 0
        ? { category: { $in: selectedCategories } }
        : {};

    try {
        let sortOptions = {};
        switch (sort) {
            case 'priceLowToHigh':
                sortOptions = { price: 1 };
                break;
            case 'priceHighToLow':
                sortOptions = { price: -1 };
                break;
            case 'newArrivals':
                sortOptions = { createdAt: -1 };
                break;
            default:
                break;
        }

        let products = await Product.find(categoryFilter)
            .skip(skip)
            .limit(limit)
            .sort(sortOptions)
            .populate('category')
            .select('name description price stockStatus stock images category');

        const totalProducts = await Product.countDocuments(categoryFilter);
        const totalPages = Math.ceil(totalProducts / limit);

        const productsWithOffers = await Promise.all(
            products.map(async (product) => {
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
                    product.discountedPrice = offer.discountType === 'percentage'
                        ? product.price * (1 - offer.discountValue / 100)
                        : product.price - offer.discountValue;
                    product.discountedPrice = parseFloat(product.discountedPrice.toFixed(2));
                } else {
                    product.discountedPrice = null;
                }
                return product;
            })
        );

        const wishlist = req.user ? req.user.wishlist.map(id => id.toString()) : [];
        res.json({
            products: productsWithOffers,
            totalPages,
            currentPage: page,
            selectedCategories,
            sort,
            wishlist
        });
    } catch (error) {
        console.error('Error filtering products:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.viewProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId).populate('category');
        
        if (!product || product.isDelete || (product.category && (product.category.isDelete || product.category.status !== 'active')) ){
            return res.status(404).send('Product not found');
        }

        const selectedAddressId = req.session.selectedAddressId || null;
        
        const offer = await Offer.findOne({
            $and: [
                { isDeleted: false },
                {
                    $or: [
                        { offerType: 'product', relatedId: product._id },
                        { offerType: 'category', relatedId: product.category ? product.category._id : null }
                    ]
                },
                { startDate: { $lte: new Date() } },
                { endDate: { $gte: new Date() } }
            ]
        });

        let discountedPrice = null;
        if (offer) {
            discountedPrice = offer.discountType === 'percentage'
                ? product.price * (1 - offer.discountValue / 100)
                : Math.max(0, product.price - offer.discountValue);
        }

        const source = req.query.source || 'shop'; 
        
        const relatedProducts = product.category
            ? await Product.find({
                _id: { $ne: product._id },
                category: product.category._id
            }).limit(4)
            : [];

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
