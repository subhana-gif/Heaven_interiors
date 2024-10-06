const User=require('../models/User')

const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        req.user = req.session.user; // Attach user info to the request
        return next(); // Proceed to the next middleware or route handler
    } else {
        return res.redirect('/user/user_login'); // Redirect to login if not authenticated
    }
};

const checkUserBlocked = async (req, res, next) => {
    const userId = req.session.user?._id; // Assuming you're storing user ID in session

    if (!userId) {
        return res.redirect('/user/user_login'); // Redirect to login if user is not logged in
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.isBlocked) {
            // Optionally destroy the session if the user is blocked
            req.session.destroy(); // Clear the session
            return res.redirect('/user/user_login'); // Redirect to login page
        }

        next();
    } catch (error) {
        console.error('Error checking user status:', error);
        return res.redirect('/user/user_login'); // Redirect on error as a fallback
    }
};

module.exports = {
    isAuthenticated,
    checkUserBlocked
};
