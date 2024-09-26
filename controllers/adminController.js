const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'admin123';

// Render Login Page
exports.renderLoginPage = (req, res) => {
    res.render('login', { errorMessage: null, successMessage: null });
};

// Handle Login Request
exports.handleLogin = (req, res) => {
    const { email, password } = req.body;

    if (email == DEFAULT_EMAIL && password == DEFAULT_PASSWORD) {
        req.session.isAdmin = true; 
        console.log('isAdmin',req.session.isAdmin);
        
        res.redirect('/adminPanel/dashboard');
    } else {
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
    req.session.isAdmin=false
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Logout failed.');
        }
        res.clearCookie('connect.sid');
        res.redirect('/adminPanel/login');
    });
};

