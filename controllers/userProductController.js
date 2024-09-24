// userProductController.js
const Product = require('../models/productModal');
const Category = require('../models/category');

// Render Product Page for Users
exports.renderUserProductPage = async (req, res) => {
    try {
        const search = req.query.search || '';
        const currentPage = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (currentPage - 1) * limit;

        const products = await Product.find({
            name: { $regex: search, $options: 'i' },
            isDelete: false // Ensure not to show deleted products
        })
        .skip(skip)
        .limit(limit)
        .populate('category');

        const totalProducts = await Product.countDocuments({
            name: { $regex: search, $options: 'i' },
            isDelete: false // Ensure not to count deleted products
        });

        const categories = await Category.find();

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('userSide/shop', {
            products,
            categories,
            search,
            currentPage,
            totalPages,
            body: 'user/shop' // Add this line
        });
        
    } catch (error) {
        console.error("Error in renderUserProductPage:", error);
        res.status(500).send('Server Error');
    }
};

// View Product Details
exports.viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category');
        if (!product || product.isDelete) {
            return res.status(404).send('Product not found');
        }

        console.log('Fetched Product:', product); // Log the fetched product

        // Fetch related products (e.g., same category)
        const relatedProducts = await Product.find({
            _id: { $ne: product._id }, // Exclude the current product
            category: product.category
        }).limit(4); // Limit the number of related products

        res.render('userSide/viewProduct', { product, relatedProducts });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(404).send('Product not found');
    }
};

