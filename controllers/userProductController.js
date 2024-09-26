// userProductController.js
const Product = require('../models/productModal');
const Category = require('../models/category');


exports.renderUserProductPage = async (req, res) => {
    try {
        const products = await getProducts(); // Fetch all products

        // Get the user from the request; it should be set by your auth middleware
        const user = req.user || null;

        // Render the shop page with products and user
        res.render('userSide/shop', { products, user });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Fetch all products and populate categories



// View Product Details
exports.viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category');
        
        // Check if the product exists and is not marked as deleted
        if (!product || product.isDelete) {
            return res.status(404).send('Product not found');
        }

        // Fetch related products from the same category, excluding the current product
        const relatedProducts = await Product.find({
            _id: { $ne: product._id }, // Exclude the current product
            category: product.category
        }).limit(4); // Limit to 4 related products

        // Pass the user data and render the product view
        res.render('userSide/viewProduct', {
            product,
            relatedProducts,
            user: req.session.user || null  // Pass user session for navbar handling
        });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(404).send('Product not found');
    }
};


const getProducts = async () => {
    try {
        return await Product.find(); // Fetch all products
    } catch (error) {
        throw new Error('Error fetching products');
    }
};

