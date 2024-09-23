const Product = require('../models/productModal');
const Category = require('../models/category');
const sharp = require('sharp');


exports.renderProductPage = async (req, res) => {
   

    try {
        const search = req.query.search || '';
        const currentPage = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (currentPage - 1) * limit;
        const products = await Product.find({
            name: { $regex: search, $options: 'i' }
        }).skip(skip).limit(limit).populate('category');

        const totalProducts = await Product.countDocuments({
            name: { $regex: search, $options: 'i' }
        });

        const categories = await Category.find();

        const totalPages = Math.ceil(totalProducts / limit);
       
        res.render('adminPanel', {
            body: 'admin/products',
            products,
            categories,
            search,
            currentPage,
            totalPages
        });
    } catch (error) {
        console.error("Error in renderProductPage:", error);
        res.status(500).send('Server Error');
    }
};

// Add Product
exports.addProduct = async (req, res) => {
    try {
        const { name, description, price, category, stockQuantity, stockStatus } = req.body;

        // Validate inputs
        if (!name || !description || !price || !category || !stockQuantity || !stockStatus) {
            return res.status(400).send('All fields are required.');
        }

        const images = req.files ? req.files.map(file => file.path) : [];

        const newProduct = new Product({
            name,
            description,
            price,
            category,
            stock: stockQuantity,
            stockStatus,
            images
        });

        await newProduct.save();
        res.redirect('/adminPanel/products'); // Redirect after successful save
    } catch (err) {
        console.error('Error adding product:', err.message);
        res.status(500).send('Server Error');
    }
};

// Render Edit Product Page
exports.renderEditProductPage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render('editProduct', { product });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(404).send('Product not found');
    }
};

// Handle Product Edit
exports.editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, category, stockQuantity, stockStatus } = req.body;

        // Fetch the existing product from the database
        const product = await Product.findById(productId);

        // If new files are uploaded, use them; otherwise, keep existing images
        let images = req.files && req.files.length > 0 
            ? req.files.map(file => file.path) 
            : product.images;

        // Ensure that the product has at least 3 images
        if (images.length < 3) {
            return res.status(400).send('Product must have at least 3 images.');
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(productId, {
            name,
            description,
            price,
            category,
            stock: stockQuantity,
            stockStatus,
            images
        }, { new: true });

        res.redirect('/adminPanel/products');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};


// View Product Details
exports.viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render('viewProduct', { product });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(404).send('Product not found');
    }
};

// Toggle Product Status
exports.toggleProductStatus = async (req, res) => {
    try {
        console.log('hi');
        
        const productId = req.params.id;
        const product = await Product.findById(productId);
        
        // Toggle the isDelete status
        product.isDelete = !product.isDelete; 
        await product.save();
        res.redirect('/adminPanel/products');
    } catch (err) {
        console.error('Error toggling product status:', err);
        res.status(500).send('Failed to toggle product status');
    }
};

// Handle Product Deletion
exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/products');
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).send('Failed to delete product');
    }
};
