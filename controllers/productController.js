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


// Edit Product Page
exports.renderEditProductPage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render('editProduct', { product });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(404).send('Product not found');
    }
};


// Add Product
exports.addProduct = async (req, res) => {
    try {
        const { name, description, price, category, stockQuantity, stockStatus } = req.body;

        if (!name || !description || !price || !category || !stockQuantity || !stockStatus) {
            return res.status(400).send('All fields are required.');
        }


        if (price < 0) {
            return res.status(400).send('Price cannot be negative.');
        }
        if (stockQuantity < 0) {
            return res.status(400).send('Stock Quantity cannot be negative.');
        }


        const images = req.files ? req.files.map(file => file.path) : [];

        const newProduct = new Product({
            name,
            description,
            price,
            category,
            stock: stockQuantity,
            stockStatus,
            images,
        });

        await newProduct.save();
        res.redirect('/adminPanel/products');
    } catch (err) {
        console.error('Error adding product:', err.message);
        res.status(500).send('Server Error');
    }
};



//Product Edit
exports.editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, category, stockQuantity, stockStatus } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        let imagesToDelete = req.body.deleteImages || []; 
        if (!Array.isArray(imagesToDelete)) {
            imagesToDelete = [imagesToDelete]; 
        }
        product.images = product.images.filter(image => !imagesToDelete.includes(image));

        const uploadedFiles = req.files.images; 
        if (uploadedFiles) {
            uploadedFiles.forEach((file, index) => {
                // Replace the image at the specific index
                if (index < product.images.length) {
                    const oldImage = product.images[index];
                    product.images[index] = file.path; 
                }
            });
        }
        if (price < 0) {
            return res.status(400).send('Price cannot be negative.');
        }
        if (stockQuantity < 0) {
            return res.status(400).send('Stock Quantity cannot be negative.');
        }

        const newImages = req.files ? req.files.map(file => file.path) : [];
        product.images.push(...newImages);
        if (product.images.length < 3) {
            return res.status(400).send('Product must have at least 3 images.');
        }

        product.name = name;
        product.description = description;
        product.price = price;
        product.category = category;
        product.stock = stockQuantity;
        product.stockStatus = stockStatus;

        await product.save();

        res.redirect('/adminPanel/products');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

exports.uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send('File uploaded successfully!');
};



// View Product Details
exports.viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('reviews');
        res.render('viewProduct', { product });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(404).send('Product not found');
    }
};

// Toggle Product Status
exports.toggleProductStatus = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        
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

exports.updateSpecifications = async (req, res) => {
    const productId = req.params.id;
    const { highlights, specifications } = req.body;

    try {
        await Product.findByIdAndUpdate(productId, {
            highlights,
            specifications,
        });

        res.redirect('/adminPanel/products'); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};