const User = require('../models/User');
const Category = require('../models/category');
const bcrypt = require('bcrypt');
const { generateOtp } = require('./otpController');  // Adjust the path to otpController.js accordingly
const { sendOtpEmail } = require('./otpController');  // Adjust the path to otpController.js accordingly

// Render login page
const renderUserLogin = (req, res) => {
    res.render('userSide/login', { errorMessage: null, successMessage: null });
};

// Render signup page
const renderUserSignup = (req, res) => {
    const { errorMessage, email, username } = req.query;
    res.render('userSide/signup', {
        errorMessage: errorMessage || null,
        successMessage: null,  // Define successMessage as null by default
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
            id: user._id, // Or the appropriate user data
            profileImage: user.profileImage // Assuming user has a profile image
        };
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
    console.log('Request Body:', req.body);  // Log the request body to debug

    const { email, username, password, confirmPassword } = req.body;

    // Check if passwords match
    if (password !== confirmPassword) {
        console.log('Passwords do not match'); // Debugging log
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

        // const newUser = new User({ email, username, password });
        // await newUser.save();
        req.session.username=username;
        req.session.password=password;
        req.session.email = email;  // Save email to session for OTP verification
        console.log('Session email:', req.session.email);
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


// Handle user logout
const handleUserLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            return res.redirect('/user/home');
        }
        res.clearCookie('connect.sid');  // Clear the session cookie (optional, based on session config)
        return res.redirect('/user/user_login');  // Redirect to login page or home
    });
};


const getUserProfile = (req, res) => {
    // Sample user data, replace with actual data from your database
    const user = {
        name: "User Name",
        email: "user@example.com",
        phone: "(123) 456-7890",
        orders: [
            { id: 12345, date: "2024-01-01", status: "Delivered" },
            { id: 12346, date: "2024-02-01", status: "Shipped" }
        ],
        wishlist: ["Item 1", "Item 2"]
    };

    res.render('userSide/profile', { user });
};



const updateUserProfile = (req, res) => {
    const { name, email, phone } = req.body;

    // Update user data in the database
    // Here, you would typically perform a database operation to update the user.

    console.log('Updated user data:', { name, email, phone });

    // Redirect back to the profile page or send a success message
    res.redirect('/user/profile'); // Redirect to the profile page
};

// Exporting the controller methods
module.exports = {
    renderUserLogin,
    renderUserSignup,
    handleUserLogin,
    handleUserSignup,
    handleUserLogout,
    getUserProfile,
    updateUserProfile
};
