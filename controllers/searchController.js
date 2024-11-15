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

    try {
        let results = [];
        if (query === '') {
            results = await Product.find({}).populate('category');
        } else {
            const searchRegex = new RegExp(query, 'i');
            const categories = await Category.find({ name: { $regex: searchRegex } });
            const categoryIds = categories.map(category => category._id);

            results = await Product.find({
                $or: [
                    { name: { $regex: searchRegex } },
                    { category: { $in: categoryIds } }
                ]
            }).populate('category');
        }

        results = results.filter(product => {
            if (!product || product.isDelete) return false;
            if (product.category && product.category.status !== 'active' && product.category.isDelete !== 'false') return false;
            return true;
        });

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

        if (results.length > 0 && sort) {
            switch (sort) {
                case 'popularity':
                    results.sort((a, b) => b.popularity - a.popularity);
                    break;
                case 'priceLowToHigh':
                    results.sort((a, b) => a.price - b.price);
                    break;
                case 'priceHighToLow':
                    results.sort((a, b) => b.price - a.price);
                    break;
                case 'averageRatings':
                    results.sort((a, b) => b.averageRating - a.averageRating);
                    break;
                case 'featured':
                    results = results.filter(item => item.featured === true);
                    break;
                case 'newArrivals':
                    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case 'aToZ':
                    results.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'zToA':
                    results.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'stockManagement':
                    results.sort((a, b) => b.stock - a.stock);
                    break;
                default:
                    break;
            }
        }

        res.render('userSide/searchResult', { query, results });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};







