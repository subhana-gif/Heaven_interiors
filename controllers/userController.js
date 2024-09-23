const User = require('../models/User');
const Category = require('../models/category');
const bcrypt = require('bcrypt');



const renderUserLogin = (req, res) => {
    res.render('userSide/login', { errorMessage: null, successMessage: null });
};

const renderUserSignup = (req, res) => {
    const { errorMessage, email, username } = req.query;
    res.render('userSide/signup', {
        errorMessage: errorMessage || null,
        successMessage: null,  // Define successMessage as null by default
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
        return res.redirect('/user/home');
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
                successMessage: null,  // Make sure successMessage is null when there's an error
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

        // If signup was successful, you might want to redirect to the OTP form or show a success message.
        res.redirect('/user/otp_form');
    } catch (error) {
        console.error('Error during signup:', error);
        return res.render('userSide/signup', {
            errorMessage: 'Internal server error',
            successMessage: null,  // Define successMessage as null
            email,
            username
        });
    }
};


// Exporting the controller methods
module.exports = {
    renderUserLogin,
    renderUserSignup,
    handleUserLogin,
    handleUserSignup,
};
