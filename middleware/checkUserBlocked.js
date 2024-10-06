const User = require('../models/User'); // Adjust the path as needed

const checkUserBlocked = async (req, res, next) => {
    const userId = req.session.user?._id; // Assuming you're storing user ID in session

    if (!userId) {
        return res.redirect('/user/login'); // Redirect to login if user is not logged in
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.isBlocked) {
            // Optionally destroy the session if the user is blocked
            req.session.destroy(); // Clear the session
            return res.redirect('/user/login'); // Redirect to login page
        }

        next();
    } catch (error) {
        console.error('Error checking user status:', error);
        return res.redirect('/user/login'); // Redirect on error as a fallback
    }
};

module.exports = checkUserBlocked;
