const Category = require('../models/category');
const Product = require('../models/productModal');

const renderHomePage = async (req, res) => {
    try {
        const categories = await Category.find();
        const products = await Product.find();

        res.render('userSide/homePage', {
            user: req.session.user || null,
            categories,
            products
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Server Error');
    }
};



//categories
const fetchCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Error fetching categories');
    }
};

//fetching products
const fetchProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products); 
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
