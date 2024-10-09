const User = require('../models/User'); 

const checkUserBlocked = async (req, res, next) => {
    const userId = req.session.user?._id; 

    if (!userId) {
        return res.redirect('/user/login');
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.isBlocked) {
            req.session.destroy(); 
            return res.redirect('/user/login'); 
        }

        next();
    } catch (error) {
        console.error('Error checking user status:', error);
        return res.redirect('/user/login'); 
    }
};

module.exports = checkUserBlocked;
