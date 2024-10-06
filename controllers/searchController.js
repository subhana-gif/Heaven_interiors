// searchController.js

const Product = require('../models/productModal'); // Adjust path as necessary
const Category = require('../models/category'); // Adjust path as necessary

// Function to get search suggestions
exports.getSearchSuggestions = async (req, res) => {
    const query = req.query.q;

    try {
        // Find products matching the query
        const products = await Product.find({ name: { $regex: query, $options: 'i' } }).limit(5);
        // Find categories matching the query
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
        // Ensure we're querying only string fields with regex
        const searchRegex = new RegExp(query, 'i'); // 'i' for case-insensitive search

        // Find categories that match the query (if searching by category)
        const categories = await Category.find({ name: { $regex: searchRegex } });

        // Extract category IDs for querying products by category
        const categoryIds = categories.map(category => category._id);

        // Search for products matching the query in either the name or category
        let results = await Product.find({
            $or: [
                { name: { $regex: searchRegex } },        // Case-insensitive search for product name
                { category: { $in: categoryIds } }        // Search by matching category IDs
            ]
        }).populate('category'); // Populates the category field with category details

        // Sorting logic based on the sort parameter
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

        // Render the search results page with the sorted results
        res.render('userSide/searchResult', { query, results });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};






