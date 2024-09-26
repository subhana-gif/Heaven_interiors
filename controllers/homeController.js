const Category = require('../models/category');
const Product = require('../models/productModal');

// Controller for rendering the home page
const renderHomePage = async (req, res) => {
    try {
        const categories = await Category.find();
        const products = await Product.find();

        res.render('userSide/homePage', {
            user: req.session.user || null,  // Pass user data to the view
            categories,
            products
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Server Error');
    }
};



// Controller for fetching categories (for API or AJAX)
const fetchCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);  // Send categories as JSON
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Error fetching categories');
    }
};

// Controller for fetching products (for API or AJAX)
const fetchProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);  // Send products as JSON
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
};

module.exports = {
    renderHomePage,
    fetchCategories,
    fetchProducts,
};
