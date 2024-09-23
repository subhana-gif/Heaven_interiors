const nodemailer = require('nodemailer');

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
};
