const Product = require('../models/productModal'); 
const Category = require('../models/category'); 
const Offer = require ('../models/offer')


exports.getSearchSuggestions = async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.json([]); 
    }

    try {
        const products = await Product.find({ name: { $regex: query, $options: 'i' } }).limit(5);
        const categories = await Category.find({ name: { $regex: query, $options: 'i' } }).limit(5);

        const suggestions = [
            ...products.map(product => ({ name: product.name, type: 'product' })),
            ...categories.map(category => ({ name: category.name, type: 'category' })),
        ];

        res.json(suggestions);
    } catch (error) {
        console.error('error geting search',error);
        res.status(500).send('Server Error');
    }
};


exports.getSearchResults = async (req, res) => {
    const query = req.query.q.trim();
    const sort = req.query.sort;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;

    try {
        let filter = {};
        let totalResults = 0;

        if (query !== '') {
            const searchRegex = new RegExp(query, 'i');
            const categories = await Category.find({ name: { $regex: searchRegex } });
            const categoryIds = categories.map(category => category._id);

            filter = {
                $or: [
                    { name: { $regex: searchRegex } },
                    { category: { $in: categoryIds } }
                ]
            };
        }

        // Get total count for pagination
        totalResults = await Product.countDocuments(filter);

        // Define sorting criteria
        let sortCriteria = {};
        switch (sort) {
            case 'popularity':
                sortCriteria.popularity = -1; // Descending
                break;
            case 'priceLowToHigh':
                sortCriteria.price = 1; // Ascending
                break;
            case 'priceHighToLow':
                sortCriteria.price = -1; // Descending
                break;
            case 'averageRatings':
                sortCriteria.averageRating = -1; // Descending
                break;
            case 'newArrivals':
                sortCriteria.createdAt = -1; // Newest first
                break;
            case 'aToZ':
                sortCriteria.name = 1; // Alphabetical (A-Z)
                break;
            case 'zToA':
                sortCriteria.name = -1; // Reverse alphabetical (Z-A)
                break;
            case 'stockManagement':
                sortCriteria.stock = -1; // Higher stock first
                break;
            default:
                break;
        }

        // Fetch sorted and paginated results
        let results = await Product.find(filter)
            .populate('category')
            .sort(sortCriteria) // Apply sorting first
            .skip((page - 1) * limit) // Apply pagination
            .limit(limit);

        // Apply discounts for each product
        for (const product of results) {
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
                product.discountedPrice = parseFloat(product.discountedPrice.toFixed(2));
            } else {
                product.discountedPrice = null;
            }
        }

        // Map product images and data
        results = results.map(product => {
            const productImagePath = product.images && product.images.length > 0
                ? `/uploads/${product.images[0].split('\\').pop().split('/').pop()}`
                : '/uploads/placeholder.jpg';

            return {
                ...product._doc,
                image: productImagePath,
                discountedPrice: product.discountedPrice
            };
        });

        const totalPages = Math.ceil(totalResults / limit);

        // Send results to the view
        res.render('userSide/searchResult', {
            query,
            results,
            currentPage: page,
            totalPages,
            sort, // Send the current sort option
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};







