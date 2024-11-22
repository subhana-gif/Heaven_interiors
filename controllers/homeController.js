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




module.exports = {renderHomePage};
