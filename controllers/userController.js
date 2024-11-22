const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const Cart=require('../models/cart')
const { sendOtpEmail } = require('./otpController'); 

const renderUserLogin = (req, res) => {
    try{
        res.set('Cache-Control', 'no-store'); 
        res.render('userSide/login', { errorMessage: null, successMessage: null });
    }catch(error){
        console.error('error rendering user login',error);
        res.status(500).send('Server Error');
    }
};

const renderUserSignup = (req, res) => {
    try{
    const { errorMessage, email, username } = req.query;
    res.render('userSide/signup', {
        errorMessage: errorMessage || null,
        successMessage: null, 
        email: email || '',
        username: username || ''
    });
}catch(error){
    console.error('error rendering user signup',error);
    res.status(500).send('Server Error');
}
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
    try{
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            return res.redirect('/user/home');
        }
        res.clearCookie('connect.sid');  
        return res.redirect('/user/user_login');
    });
    }catch(error){
        console.error('error handling logout',error);
        res.status(500).send('Server Error');
    }
};

const renderForgotPassword = (req, res) => {
    try{
        res.render('userSide/forgetPassword', { errorMessage: null, successMessage: null });
    }catch(error){
        console.error('error rendering forget password page',error);
        res.render('userSide/forgetPassword', { errorMessage: null, successMessage: null });        
    }
};

const handleForgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('userSide/forgetPassword', {
                errorMessage: 'No account with that email found',
                successMessage: null
            });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; 
        user.resetPasswordToken = token;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();
        
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'subhanathasni@gmail.com',
                pass: 'iaae sycc iwel tjji' 
            }
        });

        const mailOptions = {
            to: user.email,
            from: 'subhanathasni@gmail.com',
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
                Please click on the following link, or paste this into your browser to complete the process:\n\n
                http://${req.headers.host}/user/reset_password/${token}\n\n
                If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        await transporter.sendMail(mailOptions);

        return res.render('userSide/forgetPassword', {
            errorMessage: null,
            successMessage: 'An e-mail has been sent with further instructions.'
        });
    } catch (error) {
        console.error('Error during forgot password:', error);
        return res.render('userSide/forgetPassword', {
            errorMessage: 'Internal server error',
            successMessage: null
        });
    }
};

const renderResetPassword = async (req, res) => {
    const { token } = req.params;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.render('userSide/resetPassword', {
                errorMessage: 'Password reset token is invalid or has expired',
                successMessage: null,
                token
            });
        }

        res.render('userSide/resetPassword', {
            errorMessage: null,
            successMessage: null,
            token
        });
    } catch (error) {
        console.error('Error rendering reset password page:', error);
        return res.render('userSide/resetPassword', {
            errorMessage: 'Internal server error',
            successMessage: null,
            token
        });
    }
};

const handleResetPassword = async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('userSide/resetPassword', {
            errorMessage: 'Passwords do not match',
            successMessage: null,
            token
        });
    }

    try {

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('userSide/resetPassword', {
                errorMessage: 'Password reset token is invalid or has expired',
                successMessage: null,
                token
            });
        }


        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();



        
        return res.render('userSide/login', {
            errorMessage: null,
            successMessage: 'Password has been successfully reset. Please log in.'
        });
    } catch (error) {
        console.error('Error during password reset:', error);
        return res.render('userSide/resetPassword', {
            errorMessage: 'Internal server error',
            successMessage: null,
            token
        });
    }
};

module.exports = {
    renderUserLogin,
    renderUserSignup,
    handleUserLogin,
    handleUserSignup,
    handleUserLogout,
    renderForgotPassword,
    handleForgotPassword,
    renderResetPassword,
    handleResetPassword
};
