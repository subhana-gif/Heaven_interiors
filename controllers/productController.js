const Product = require('../models/productModal');
const Category = require('../models/category');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Make sure this directory exists
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to file name
    },
});

const upload = multer({ storage: storage });


exports.renderProductPage = async (req, res) => {
    try {
        const search = req.query.search || '';
        const currentPage = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (currentPage - 1) * limit;

        const products = await Product.find({
            name: { $regex: search, $options: 'i' }
        }).skip(skip).limit(limit).populate('category');

        console.log('Fetched Products:', products); // Log fetched products

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
            images,
        });

        await newProduct.save();
        res.redirect('/adminPanel/products');
    } catch (err) {
        console.error('Error adding product:', err.message);
        res.status(500).send('Server Error');
    }
};



// Handle Product Edit
exports.editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, category, stockQuantity, stockStatus, deleteImages, replaceImages } = req.body;

        // Fetch the product from the database
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Handle image deletions
        if (deleteImages) {
            const imagesToDelete = Array.isArray(deleteImages) ? deleteImages : [deleteImages];
            product.images = product.images.filter(image => !imagesToDelete.includes(image));

            // Optional: Delete the image files from the filesystem if necessary
            imagesToDelete.forEach(image => {
                const imagePath = path.join(__dirname, '../uploads/', image); // Adjust path as needed
                fs.unlink(imagePath, err => {
                    if (err) {
                        console.error(`Failed to delete image ${image}:`, err);
                    }
                });
            });
        }

        // Handle image replacements
        if (replaceImages) {
            const imagesToReplace = Array.isArray(replaceImages) ? replaceImages : [replaceImages];

            imagesToReplace.forEach((newImage, index) => {
                if (product.images[index]) {
                    // Delete the old image file if necessary
                    const oldImagePath = path.join(__dirname, '../uploads/', product.images[index]); // Adjust path as needed
                    fs.unlink(oldImagePath, err => {
                        if (err) {
                            console.error(`Failed to delete old image ${product.images[index]}:`, err);
                        }
                    });

                    // Replace the old image with the new image path
                    product.images[index] = newImage; 
                }
            });
        }

        // If new files are uploaded, use them; otherwise, keep existing images
        const newImages = req.files ? req.files.map(file => file.path) : [];
        product.images.push(...newImages); // Add new images to the product

        // Ensure that the product has at least 3 images
        if (product.images.length < 3) {
            return res.status(400).send('Product must have at least 3 images.');
        }

        // Update the product details
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

// controllers/uploadController.js

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

exports.updateSpecifications = async (req, res) => {
    const productId = req.params.id;
    const { highlights, specifications } = req.body;

    try {
        // Find the product and update its highlights and specifications
        await Product.findByIdAndUpdate(productId, {
            highlights,
            specifications,
        });

        // Redirect back to the products page or send a success response
        res.redirect('/adminPanel/products'); // Adjust the redirect URL as needed
    } catch (error) {
        console.error(error);
        // Handle the error (e.g., send an error message or render an error page)
        res.status(500).send('Server Error');
    }
};