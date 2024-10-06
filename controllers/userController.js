const User = require('../models/User');
const Category = require('../models/category');
const bcrypt = require('bcrypt');
const Cart=require('../models/cart')
const { sendOtpEmail } = require('./otpController'); 

// Render login page
const renderUserLogin = (req, res) => {
    res.render('userSide/login', { errorMessage: null, successMessage: null });
};

// Render signup page
const renderUserSignup = (req, res) => {
    const { errorMessage, email, username } = req.query;
    res.render('userSide/signup', {
        errorMessage: errorMessage || null,
        successMessage: null, 
        email: email || '',
        username: username || ''
    });
};

// Handle user login
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
        if (user.isBlocked) {
            return res.render('userSide/login',{ errorMessage: 'Your account is blocked. Please contact support.',
                successMessage:null
             });
          }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('userSide/login', {
                errorMessage: 'Invalid email or password',
                successMessage: null
            });
        }

        req.session.user = {
            _id: user._id,
            email: user.email,
            username: user.username
        };

        const cart = await Cart.findOne({ userId: user._id });
        req.session.cart = cart ? cart.items : [];
        console.log(req.session.user)
        return res.redirect('/user/home');
    } catch (error) {
        console.error('Error during login:', error);
        return res.render('userSide/login', {
            errorMessage: 'Internal server error',
            successMessage: null
        });
    }
};

// Handle user signup
const handleUserSignup = async (req, res) => {

    const { email, username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('userSide/signup', {
            errorMessage: 'Passwords do not match',
            successMessage: null,
            email: email,
            username: username
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('userSide/signup', {
                errorMessage: 'Email already registered',
                successMessage: null,
                email,
                username
            });
        }

        req.session.username=username;
        req.session.password=password;
        req.session.email = email;
        await sendOtpEmail(req,email)
        
       return res.redirect('/user/otp_form');
    } catch (error) {
        console.error('Error during signup:', error);
        return res.render('userSide/signup', {
            errorMessage: 'Internal server error',
            successMessage: null,
            email,
            username
        });
    }
};


const handleUserLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            return res.redirect('/user/home');
        }
        res.clearCookie('connect.sid');  
        return res.redirect('/user/user_login');
    });
};



module.exports = {
    renderUserLogin,
    renderUserSignup,
    handleUserLogin,
    handleUserSignup,
    handleUserLogout,
};
