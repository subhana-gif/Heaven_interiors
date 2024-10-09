const Product = require('../models/productModal'); 
const Category = require('../models/category'); 

// Function to get search suggestions
exports.getSearchSuggestions = async (req, res) => {
    const query = req.query.q;

    try {
        const products = await Product.find({ name: { $regex: query, $options: 'i' } }).limit(5);
        const categories = await Category.find({ name: { $regex: query, $options: 'i' } }).limit(5);

        const suggestions = [
            ...products.map(product => ({ name: product.name, type: 'product' })),
            ...categories.map(category => ({ name: category.name, type: 'category' })),
        ];

        res.json(suggestions);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getSearchResults = async (req, res) => {
    const query = req.query.q;
    const sort = req.query.sort;

    try {
        const searchRegex = new RegExp(query, 'i');
        const categories = await Category.find({ name: { $regex: searchRegex } });
        const categoryIds = categories.map(category => category._id);
        let results = await Product.find({
            $or: [
                { name: { $regex: searchRegex } },        
                { category: { $in: categoryIds } }       
            ]
        }).populate('category'); 

        results = results.map(product => {
            const productImagePath = product.images && product.images.length > 0
                ? `/uploads/${product.images[0].split('\\').pop().split('/').pop()}`
                : '/uploads/placeholder.jpg'; 

            return {
                ...product._doc,
                image: productImagePath
            };
        });
        
        switch (sort) {
            case 'popularity':
                results = results.sort((a, b) => b.popularity - a.popularity);
                break;
            case 'priceLowToHigh':
                results = results.sort((a, b) => a.price - b.price);
                break;
            case 'priceHighToLow':
                results = results.sort((a, b) => b.price - a.price);
                break;
            case 'averageRatings':
                results = results.sort((a, b) => b.averageRating - a.averageRating);
                break;
            case 'featured':
                results = results.filter(item => item.featured === true);
                break;
            case 'newArrivals':
                results = results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'aToZ':
                results = results.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'zToA':
                results = results.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'stockManagement':
                results = results.sort((a, b) => b.stock - a.stock);
                break;
            default:
                break;
        }

        res.render('userSide/searchResult', { query, results });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};






