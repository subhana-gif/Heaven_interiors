const User=require('../models/User')

const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        req.user = req.session.user; 
        return next(); 
    } else {
        return res.redirect('/user/user_login');
    }
};

const checkUserBlocked = async (req, res, next) => {
    const userId = req.session.user?._id;

    if (!userId) {
        return res.redirect('/user/user_login'); 
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.isBlocked) {
            req.session.destroy(); 
            return res.redirect('/user/user_login');
        }

        next();
    } catch (error) {
        console.error('Error checking user status:', error);
        return res.redirect('/user/user_login'); 
    }
};

module.exports = {
    isAuthenticated,
    checkUserBlocked
};
