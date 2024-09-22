const User = require('../models/User');
const Category = require('../models/category');
const Product = require('../models/products');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

// Create a transporter object for sending emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: 'subhanathasni@gmail.com',
        pass: 'snoh frjb ccrv hjcj' // Use environment variables for production
    }
});

// Function to generate a 6-digit OTP
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Function to send OTP email
const sendOtpEmail = async (to, otp) => {
    const mailOptions = {
        from: 'subhanathasni@gmail.com',
        to: to,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}.`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('OTP sent successfully:', info.response);
        return info.accepted.length > 0;
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Error sending OTP');
    }
};

// Controller methods
const renderOtpForm = (req, res) => {
    res.render('userSide/otpForm');
};

const verifyOtp = (req, res) => {
    const { otp } = req.body;

    if (otp === req.session.otp) {
        req.session.otp = null; // Clear OTP from session
        return res.redirect('/user_login');
    } else {
        return res.render('userSide/otpForm', {
            errorMessage: 'Invalid OTP. Please try again.'
        });
    }
};

const resendOtp = async (req, res) => {
    const newOtp = generateOtp();
    req.session.otp = newOtp;
    const email = req.session.email;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email not found in session' });
    }

    try {
        await sendOtpEmail(email, newOtp);
        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false, message: 'Failed to resend OTP' });
    }
};

const renderHomePage = async (req, res) => {
    try {
        const categories = await Category.find();
        const products = await Product.find();
        res.render('userSide/homePage', { categories, products });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Server Error');
    }
};

const fetchCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
};

const fetchProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
};

const renderUserLogin = (req, res) => {
    res.render('userSide/login', { errorMessage: null, successMessage: null });
};

const renderUserSignup = (req, res) => {
    const { errorMessage, email, username } = req.query;
    res.render('userSide/signup', {
        errorMessage: errorMessage || null,
        successMessage: null,
        email: email || '',
        username: username || ''
    });
};

const handleUserLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('userSide/login', {
                errorMessage: 'Invalid email or password',
                successMessage: null
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('userSide/login', {
                errorMessage: 'Invalid email or password',
                successMessage: null
            });
        }

        req.session.userId = user._id;
        return res.redirect('/home');
    } catch (error) {
        console.error('Error during login:', error);
        return res.render('userSide/login', {
            errorMessage: 'Internal server error',
            successMessage: null
        });
    }
};

const handleUserSignup = async (req, res) => {
    const { email, username, password, mobileNumber } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('userSide/signup', {
                errorMessage: 'Email already registered',
                email,
                username
            });
        }

        const newUser = new User({ email, username, password, mobileNumber: mobileNumber || undefined });
        await newUser.save();

        const otp = generateOtp();
        req.session.otp = otp;
        req.session.email = email;

        await sendOtpEmail(email, otp);
        return res.redirect('/otp_form');
    } catch (error) {
        console.error('Error during signup:', error);
        return res.render('userSide/signup', {
            errorMessage: 'Internal server error',
            email,
            username
        });
    }
};

// Additional Product-related methods
const fetchProductsList = async (req, res) => {
    try {
        const products = await Product.find({ isDelete: false });
        res.render('products', { products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
};

const fetchProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product || product.isDelete) {
            return res.status(404).send('Product not found');
        }

        const relatedProducts = await Product.find({ category: product.category, _id: { $ne: product._id } }).limit(4);
        res.render('productDetail', { product, relatedProducts });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Error fetching product details');
    }
};

// Exporting the controller methods
module.exports = {
    renderOtpForm,
    verifyOtp,
    resendOtp,
    renderHomePage,
    fetchCategories,
    fetchProducts,
    renderUserLogin,
    renderUserSignup,
    handleUserLogin,
    handleUserSignup,
    fetchProductsList,
    fetchProductDetails,
};
