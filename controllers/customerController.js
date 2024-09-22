const Customers = require('../models/customers');

// Render the Customer Page
exports.renderCustomerPage = async (req, res) => {
    const search = req.query.search || ''; // Default to an empty string if no search query is provided
    const currentPage = parseInt(req.query.page) || 1; // Get the current page from query, default to 1
    const itemsPerPage = 10; // Define how many items you want per page
    
    try {
        // Fetch customers based on the search query with pagination
        const customersList = await Customers.find({
            $or: [
                { name: { $regex: search, $options: 'i' } }, // Case-insensitive search
                { email: { $regex: search, $options: 'i' } }
            ]
        })
        .skip((currentPage - 1) * itemsPerPage)
        .limit(itemsPerPage);

        // Count total documents to calculate pagination
        const totalCustomers = await Customers.countDocuments({
            $or: [
                { name: { $regex: search, $options: 'i' } }, 
                { email: { $regex: search, $options: 'i' } }
            ]
        });

        const totalPages = Math.ceil(totalCustomers / itemsPerPage); // Total number of pages

        // Render the customers page and pass the search value, current page, and total pages
        res.render('adminPanel', {
            body:'admin/customers',
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

// List Customers
exports.listCustomers = async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 10; // Define how many items you want per page
        let customersList;

        if (searchQuery) {
            customersList = await Customers.find({
                $or: [
                    { name: new RegExp(searchQuery, 'i') },
                    { email: new RegExp(searchQuery, 'i') }
                ]
            })
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);
        } else {
            customersList = await Customers.find()
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);
        }

        const totalCustomers = await Customers.countDocuments({
            $or: [
                { name: new RegExp(searchQuery, 'i') },
                { email: new RegExp(searchQuery, 'i') }
            ]
        });

        const totalPages = Math.ceil(totalCustomers / itemsPerPage);

        res.render('adminPanel', {
            body: 'admin/customers',
            customers: customersList,
            search: searchQuery,
            totalPages,
            currentPage // Pass the current page number to the view
        });
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).send('Server Error');
    }
};
