const Product = require('../models/productModal');
const Category = require('../models/category');

exports.renderUserProductPage = async (req, res) => {
    try {
        const categoryName = req.query.category; // Get category name from query string
        let products;

        if (categoryName) {
            const category = await Category.findOne({ name: categoryName,status: 'active' });

            if (category) {
                products = await Product.find({
                    category: category._id,
                    isDelete: false
                });
            } else {
                products = [];
            }
        } else {
            const activeCategories = await Category.find({ status: 'active' }).select('_id');
            products = await Product.find({  category: { $in: activeCategories },isDelete: false });
        }

        const user = req.user || null;
        res.render('userSide/shop', { products, user });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
};

exports.viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category');
        const selectedAddressId = req.session.selectedAddressId || null;

        if (!product || product.isDelete || (product.category && product.category.status !== 'active')) {
            return res.status(404).send('Product not found');
        }
        const source = req.query.source || 'shop'; 
        const relatedProducts = await Product.find({
            _id: { $ne: product._id },
            category: product.category
        }).limit(4); 

        res.render('userSide/viewProduct', {
            product,
            relatedProducts,
            source,
            selectedAddressId,
            user: req.session.user || null
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
