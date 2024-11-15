require('dotenv').config();
const DEFAULT_EMAIL = process.env.DEFAULT_EMAIL;
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD;

exports.renderLoginPage = (req, res) => {
    try {
        res.render('login', { errorMessage: null, successMessage: null });
    } catch (error) {
        console.error("Error rendering login page:", error);
        res.status(500).send('Error loading the login page');
    }
};

exports.handleLogin = (req, res) => {
    try {
        const { email, password } = req.body;

        if (email === DEFAULT_EMAIL && password === DEFAULT_PASSWORD) {
            req.session.isAdmin = true;
            res.redirect('/adminPanel/dashboard');
        } else {
            res.render('login', { errorMessage: 'Invalid email or password', successMessage: null });
        }
    } catch (error) {
        console.error("Error handling login:", error);
        res.status(500).send('Error processing login');
    }
};

exports.renderAdminPanel = (req, res) => {
    try {
        if (req.session.isAdmin) {
            res.render('adminPanel', { body: 'admin/dashboard' });
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error("Error rendering admin panel:", error);
        res.status(500).send('Error loading the admin panel');
    }
};

exports.renderDashboardPage = (req, res) => {
    try {
        res.render('admin/dashboard');
    } catch (error) {
        console.error("Error rendering dashboard page:", error);
        res.status(500).send('Error loading the dashboard');
    }
};

exports.logout = (req, res) => {
    try {
        req.session.isAdmin = false;
        req.session.destroy(err => {
            if (err) {
                console.error("Error during logout:", err);
                return res.status(500).send('Logout failed.');
            }
            res.clearCookie('connect.sid');
            res.redirect('/adminPanel/login');
        });
    } catch (error) {
        console.error("Error handling logout:", error);
        res.status(500).send('Error logging out');
    }
};
