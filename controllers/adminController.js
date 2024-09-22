const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret_key';
const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'admin123';

// Render Login Page
exports.renderLoginPage = (req, res) => {
    res.render('login', { errorMessage: null, successMessage: null });
};

// Handle Login Request
exports.handleLogin = (req, res) => {
    const { email, password } = req.body;

    // Check if the credentials match the default admin credentials
    if (email === DEFAULT_EMAIL && password === DEFAULT_PASSWORD) {
        // Generate a token if the credentials are correct
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });

        // Set the token in the session or as a cookie
        req.session.token = token;

        // Redirect to the admin panel
        res.redirect('/adminPanel');
    } else {
        // If the credentials don't match, render the login page with an error message
        res.render('login', { errorMessage: 'Invalid email or password', successMessage: null });
    }
};

// Render Admin Panel (after login)
exports.renderAdminPanel = (req, res) => {
    // Check if user is authenticated before rendering the admin panel
    if (req.session.token) {
        res.render('adminPanel', { body: 'admin/dashboard' });
    } else {
        // Redirect to login if not authenticated
        res.redirect('/login');
    }
};

// Render the Dashboard Page
exports.renderDashboardPage = (req, res) => {
    res.render('admin/dashboard');  // Assuming you have a 'dashboard.ejs' file inside 'views/admin'
};

// controllers/authController.js

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Logout failed.');
        }
        // Redirect to the login page after logout
        res.redirect('/adminPanel/login');
    });
};
