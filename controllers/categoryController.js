const Category = require('../models/category');

exports.renderCategoryPage = (req, res) => {
    const search = req.query.search || ''; // Get the search query from the request
    const page = parseInt(req.query.page) || 1; // Get the current page, default to 1 if not provided
    const limit = 10; // Define how many categories to show per page

    // Fetch categories with pagination and search functionality
    Category.find({ name: { $regex: search, $options: 'i' }, isDeleted: false }) // Search and exclude deleted categories
        .skip((page - 1) * limit)
        .limit(limit)
        .then(categories => {
            // Count the total number of categories for pagination
            Category.countDocuments({ name: { $regex: search, $options: 'i' }, isDeleted: false })
                .then(totalCategories => {
                    res.render('adminPanel', { 
                        body: 'admin/category',
                        categories, 
                        search, 
                        currentPage: page, // Pass currentPage to the view
                        totalPages: Math.ceil(totalCategories / limit) // Calculate the total number of pages
                    });
                });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Server error');
        });
};


// Add Category
exports.addCategory = async (req, res) => {
    const { name, description, status } = req.body;
    
    const newCategory = new Category({
        name,
        description,
        status: status === 'active' ? 'active' : 'inactive',
    });

    try {
        await newCategory.save();
        res.redirect('/adminPanel/category');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Edit Category
exports.editCategory = async (req, res) => {
    try {
        const { name, description, status } = req.body;
        await Category.findByIdAndUpdate(req.params.id, {
            name,
            description,
            status: status === 'active' ? 'active' : 'inactive',
        });
        res.redirect('/adminPanel/category');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndUpdate(req.params.id, { isDeleted: true });
        res.redirect('/adminPanel/category');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Bulk Update Categories
exports.bulkUpdateCategories = async (req, res) => {
    try {
        const { action, selectedCategories } = req.body;

        if (action === 'delete') {
            await Category.updateMany({ _id: { $in: selectedCategories } }, { isDeleted: true });
        } else if (action === 'status') {
            await Category.updateMany({ _id: { $in: selectedCategories } }, { status: req.body.status });
        }

        res.redirect('/adminPanel/category');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
