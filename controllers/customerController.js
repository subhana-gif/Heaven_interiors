const User = require('../models/User');
exports.renderCustomerPage = async (req, res) => {
    const search = req.query.search || '';
    const currentPage = parseInt(req.query.page) || 1; 
    const itemsPerPage = 5; 
    
    try {
        const customersList = await User.find({
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        })
        .skip((currentPage - 1) * itemsPerPage)
        .limit(itemsPerPage).sort({createdAt:-1});

        const totalCustomers = await User.countDocuments({
            $or: [
                { username: { $regex: search, $options: 'i' }, },
                { email: { $regex: search, $options: 'i' } }
            ]
        });

        const totalPages = Math.ceil(totalCustomers / itemsPerPage); 
        res.render('adminPanel', {
            body: 'admin/customers',
            customers: customersList,
            search, 
            currentPage,
            totalPages  
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


exports.toggleUserStatus = async (req, res) => {
    const userId = req.params.id; 
    try {
        const user = await User.findById(userId);
        if (user) {
            user.isBlocked = !user.isBlocked; 
            await user.save();
            return res.redirect('/adminPanel/customers');
        } else {
            return res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).send('Server Error');
    }
};
