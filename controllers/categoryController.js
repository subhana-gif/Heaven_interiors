const Category = require('../models/category');

exports.renderCategoryPage = async (req, res) => {
    
    try {
        const search = req.query.search || ''; 
        const currentpage = parseInt(req.query.page) || 1; 
        const limit = 5;
        const skip = (currentpage - 1) * limit;

        const categories = await Category.find({
            name: { $regex: search, $options: 'i' }
        }).skip(skip).limit(limit);
        
        const totalCategories = await Category.countDocuments({
            name: { $regex: search, $options: 'i' }
        });
        
        const totalPages = Math.ceil(totalCategories / limit);

        res.render('adminPanel', {
            body: 'admin/category',
            categories,
            search,
            currentpage,
            totalPages,
            errorMessage: null
        });
    } catch (error) {
        console.error("Error in renderCategoryPage:", error);
        res.render('adminPanel', {
            body: 'admin/category',
            categories: [],
            search: '',
            currentpage: 1,
            totalPages: 1,
            errorMessage: 'An unexpected error occurred. Please try again.'
        });
    }
};


exports.addCategory = async (req, res) => {
    const { name, description, status } = req.body;

    try {
        const existingCategory = await Category.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
        if (existingCategory) {
            return res.render('adminPanel', {
                body: 'admin/category',
                errorMessage: 'Category name must be unique and case-sensitive.',
                categories: await Category.find({}),
                search: '',
                currentpage: 1,
                totalPages: 1
            });
        }

        const newCategory = new Category({
            name, 
            description,
            status: status === 'active' ? 'active' : 'inactive',
        });

        await newCategory.save();
        res.redirect('/adminPanel/category');
    } catch (err) {
        console.error('Error saving category:', err);

        // duplicate key error
        if (err.code === 11000) { 
            return res.render('adminPanel', {
                body: 'admin/category',
                errorMessage: 'Category name must be unique',
                categories: await Category.find({}),
                search: '',
                currentpage: 1,
                totalPages: 1
            });
        }

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
    const { name, description, status } = req.body;
    const categoryId = req.params.id;

    try {
        // Check if a category with the same name already exists (excluding the current one)
        const existingCategory = await Category.findOne({
            name: { $regex: `^${name.trim()}$`, $options: "i" },
            _id: { $ne: categoryId }, // Exclude the current category
        });

        if (existingCategory) {
            return res.render('adminPanel', {
                body: 'admin/category',
                errorMessage: 'Category name must be unique and case-sensitive.',
                categories: await Category.find({}),
                search: '',
                currentpage: 1,
                totalPages: 1,
            });
        }

        // Update the category
        await Category.findByIdAndUpdate(categoryId, {
            name: name.trim(),
            description,
            status: status === 'active' ? 'active' : 'inactive',
        });

        res.redirect('/adminPanel/category');
    } catch (err) {
        console.error('Error editing category:', err);

        // Handle unexpected errors
        res.render('adminPanel', {
            body: 'admin/category',
            errorMessage: 'An unexpected error occurred. Please try again.',
            categories: await Category.find({}),
            search: '',
            currentpage: 1,
            totalPages: 1,
        });
    }
};

// Toggle Category Status
exports.toggleCategoryStatus = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        category.isDelete = !category.isDelete; 
        await category.save();
        res.redirect('/adminPanel/category'); 
    } catch (err) {
        console.error('Error toggling category status:', err);
        res.status(500).send('Failed to toggle category status');
    }
};




