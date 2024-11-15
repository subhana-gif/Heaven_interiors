const Product = require('../models/productModal');
const Category = require('../models/category');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

exports.renderProductPage = async (req, res) => {
    try {
        const search = req.query.search || '';
        const currentPage = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (currentPage - 1) * limit;

        const products = await Product.find({
            name: { $regex: search, $options: 'i' }
        }).skip(skip).limit(limit).populate('category').sort({createdAt:-1});


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

exports.renderEditProductPage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        
        const categories = await Category.find(); 
        res.render('editProduct', { product, categories }); 
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).send('Server error');
    }
};

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

exports.editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, category, stockQuantity, stockStatus } = req.body;
        const product = await Product.findById(productId).populate('category');
        if (!product) {
            return res.status(404).send('Product not found');
        }

        product.name = name;
        product.description = description;
        product.price = price >= 0 ? price : product.price;
        product.category = category || product.category;    
        product.stock = stockQuantity >= 0 ? stockQuantity : product.stock;
        product.stockStatus = stockStatus;
        let imagesToDelete = req.body.deleteImages || []; 
        if (!Array.isArray(imagesToDelete)) {
            imagesToDelete = [imagesToDelete]; 
        }
        product.images = product.images.filter(image => !imagesToDelete.includes(image));

        const uploadedFiles = req.files.images; 
        if (uploadedFiles) {
            uploadedFiles.forEach((file, index) => {
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

        await product.save();
        res.redirect('/adminPanel/products');
    } catch (err) {
        console.error('error edit product:',err);
        res.status(500).send('Server error');
    }
};

exports.uploadImage = async(req, res) => {
    try {
        const croppedImages = [req.body.croppedData1, req.body.croppedData2, req.body.croppedData3];

        const uploadedImages = [];

        for (let i = 0; i < croppedImages.length; i++) {
            if (croppedImages[i]) {
                const base64Data = croppedImages[i].replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');

                const resizedBuffer = await sharp(buffer)
                    .resize(500, 500) 
                    .toBuffer();

                const fileName = `product_${Date.now()}_${i}.png`;
                const filePath = path.join(__dirname, 'uploads', fileName);
                await sharp(resizedBuffer).toFile(filePath);

                uploadedImages.push(fileName); 
            }
        }

        res.status(200).send('Images uploaded and processed successfully');
    } catch (error) {
        console.error('error uploading image:',error);
        res.status(500).send('Error processing images');
    }
};

exports.viewProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('reviews');
        res.render('viewProduct', { product });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(404).send('Product not found');
    }
};

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

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/products');
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).send('Failed to delete product');
    }
};

const addDays = (date, days) => {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

exports.updateSpecifications = async (req, res) => {
    const productId = req.params.id;
    const { highlights, specifications, deliveryDays } = req.body;
    const orderDate = new Date(); 
    const estimatedDelivery = addDays(orderDate,  parseInt(deliveryDays, 10)); 
    try {
        await Product.findByIdAndUpdate(productId, {
            highlights,
            specifications,
            estimatedDelivery
        });

        res.redirect('/adminPanel/products'); 
    } catch (error) {
        console.error('error updating specification:',error);
        res.status(500).send('Server Error');
    }
};