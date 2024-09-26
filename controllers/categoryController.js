const Category = require('../models/category');

exports.renderCategoryPage = async (req, res) => {
    try {
        const search = req.query.search || ''; // Get the search query from the request
        const currentpage = parseInt(req.query.page) || 1; // Get the current page, default to 1 if not provided
        const limit = 10; // Define how many categories to show per page
        const skip = (currentpage - 1) * limit;

        const categories = await Category.find({
            name: { $regex: search, $options: 'i' }
        }).skip(skip).limit(limit);
        
        const totalCategories = await Category.countDocuments({
            name: { $regex: search, $options: 'i' }
        });
        
        const totalPages = Math.ceil(totalCategories / limit);

        // Pass errorMessage as null or an empty string
        res.render('adminPanel', {
            body: 'admin/category',
            categories,
            search,
            currentpage,
            totalPages,
            errorMessage: null // Set default error message
        });
    } catch (error) {
        console.error("Error in renderCategoryPage:", error);
        res.render('adminPanel', {
            body: 'admin/category',
            categories: [],
            search: '',
            currentpage: 1,
            totalPages: 1,
            errorMessage: 'An unexpected error occurred. Please try again.' // Pass error message
        });
    }
};



// Add Category
// Add Category
// Add Category
exports.addCategory = async (req, res) => {
    const { name, description, status } = req.body;

    try {
        // Check for existing category with the same name (case-sensitive)
        const existingCategory = await Category.findOne({ name });

        if (existingCategory) {
            return res.render('adminPanel', {
                body: 'admin/category',
                errorMessage: 'Category name must be unique and case-sensitive.',
                categories: await Category.find({}), // Fetch categories again
                search: '',
                currentpage: 1,
                totalPages: 1
            });
        }

        // Create a new category object
        const newCategory = new Category({
            name, // Keep the original case
            description,
            status: status === 'active' ? 'active' : 'inactive',
        });

        // Save the new category
        await newCategory.save();
        res.redirect('/adminPanel/category');
    } catch (err) {
        console.error('Error saving category:', err);

        // Check if the error is related to duplicate key (in case the unique constraint is violated)
        if (err.code === 11000) {
            return res.render('adminPanel', {
                body: 'admin/category',
                errorMessage: 'Category name must be unique and case-sensitive.',
                categories: await Category.find({}),
                search: '',
                currentpage: 1,
                totalPages: 1
            });
        }

        // For any other errors, render a generic error message
        res.render('adminPanel', {
            body: 'admin/category',
            errorMessage: 'An unexpected error occurred. Please try again.',
            categories: await Category.find({}),
            search: '',
            currentpage: 1,
            totalPages: 1
        });
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

// Toggle Category Status
exports.toggleCategoryStatus = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        // Toggle the isDelete status
        category.isDelete = !category.isDelete; 
        await category.save();
        res.redirect('/adminPanel/category'); 
    } catch (err) {
        console.error('Error toggling category status:', err);
        res.status(500).send('Failed to toggle category status');
    }
};




