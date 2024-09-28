const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'admin123';

exports.renderLoginPage = (req, res) => {
    res.render('login', { errorMessage: null, successMessage: null });
};

exports.handleLogin = (req, res) => {
    const { email, password } = req.body;

    if (email == DEFAULT_EMAIL && password == DEFAULT_PASSWORD) {
        req.session.isAdmin = true; 
        
        res.redirect('/adminPanel/dashboard');
    } else {
        res.render('login', { errorMessage: 'Invalid email or password', successMessage: null });
    }
};


exports.renderAdminPanel = (req, res) => {
    if (req.session.token) {
        res.render('adminPanel', { body: 'admin/dashboard' });
    } else {
        res.redirect('/login');
    }
};

exports.renderDashboardPage = (req, res) => {
    res.render('admin/dashboard'); 
};


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

