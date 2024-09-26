const User = require('../models/User'); // Ensure you import the User model

// Render the Customer Page
exports.renderCustomerPage = async (req, res) => {
    const search = req.query.search || ''; // Default to an empty string if no search query is provided
    const currentPage = parseInt(req.query.page) || 1; // Get the current page from query, default to 1
    const itemsPerPage = 10; // Define how many items you want per page
    
    try {
        // Fetch users based on the search query with pagination
        const customersList = await User.find({
            $or: [
                { username: { $regex: search, $options: 'i' } }, // Adjusting to use username
                { email: { $regex: search, $options: 'i' } }
            ]
        })
        .skip((currentPage - 1) * itemsPerPage)
        .limit(itemsPerPage);

        // Count total documents to calculate pagination
        const totalCustomers = await User.countDocuments({
            $or: [
                { username: { $regex: search, $options: 'i' }, },
                { email: { $regex: search, $options: 'i' } }
            ]
        });

        const totalPages = Math.ceil(totalCustomers / itemsPerPage); // Total number of pages

        // Render the customers page and pass the search value, current page, and total pages
        res.render('adminPanel', {
            body: 'admin/customers',
            customers: customersList, // Pass the fetched customers
            search,     // Pass the search term to the view
            currentPage, // Pass the current page to the view
            totalPages   // Pass the total pages to the view
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


// Example controller method to toggle user status
exports.toggleUserStatus = async (req, res) => {
    const userId = req.params.id; // Get user ID from URL parameters
    try {
        const user = await User.findById(userId);
        if (user) {
            user.isBlocked = !user.isBlocked; // Toggle the status
            await user.save();
            return res.redirect('/adminPanel/customers'); // Redirect back to customers page
        } else {
            return res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).send('Server Error');
    }
};
