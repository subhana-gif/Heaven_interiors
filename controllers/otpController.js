const nodemailer = require('nodemailer');
const user=require('../models/User')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: 'subhanathasni@gmail.com',
        pass: 'snoh frjb ccrv hjcj' 
    }
});


const sendOtpEmail = async (req,to) => {
    const otp=Math.floor(100000 + Math.random() * 900000).toString();
    const mailOptions = {
        from: 'subhanathasni@gmail.com',
        to: to,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}.`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        req.session.otp=otp
        return;
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Error sending OTP');
    }
};

const renderOtpForm = (req, res) => {
    res.render('userSide/otpForm', { errorMessage: null });
};


const verifyOtp = async (req, res) => {
    const { otp } = req.body;
    if (otp == req.session.otp) {
        const userData = {
            email: req.session.email,
            username: req.session.username, 
            password: req.session.password
        };

        const newUser = new user(userData);
        await newUser.save(); 
        req.session.otp = null; 
        return res.redirect('/user/user_login');
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
    } catch (error) {
        console.error('Error sending OTP email:', error);
        res.status(500).json({ success: false, message: 'Failed to resend OTP' });
    }
};

module.exports = {
    renderOtpForm,
    verifyOtp,
    resendOtp,
    sendOtpEmail
};
