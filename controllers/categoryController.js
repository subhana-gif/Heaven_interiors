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
    const search = req.query.search || ''; 
    const currentpage = parseInt(req.query.page) || 1; 
    const limit = 5;
    const skip = (currentpage - 1) * limit;

    try {
        const existingCategory = await Category.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
        if (existingCategory) {
            const categories = await Category.find({
                name: { $regex: search, $options: 'i' }
            }).skip(skip).limit(limit);
            const totalCategories = await Category.countDocuments({
                name: { $regex: search, $options: 'i' }
            });
            const totalPages = Math.ceil(totalCategories / limit);

            return res.render('adminPanel', {
                body: 'admin/category',
                errorMessage: 'Category name must be unique and case-sensitive.',
                categories,
                search,
                currentpage,
                totalPages,
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

        const categories = await Category.find({
            name: { $regex: search, $options: 'i' }
        }).skip(skip).limit(limit);
        const totalCategories = await Category.countDocuments({
            name: { $regex: search, $options: 'i' }
        });
        const totalPages = Math.ceil(totalCategories / limit);

        res.render('adminPanel', {
            body: 'admin/category',
            errorMessage: 'An unexpected error occurred. Please try again.',
            categories,
            search,
            currentpage,
            totalPages,
        });
    }
};

exports.editCategory = async (req, res) => {
    const { name, description, status } = req.body;
    const categoryId = req.params.id;
    const search = req.query.search || ''; 
    const currentpage = parseInt(req.query.page) || 1; 
    const limit = 5;
    const skip = (currentpage - 1) * limit;

    try {
        const existingCategory = await Category.findOne({
            name: { $regex: `^${name.trim()}$`, $options: "i" },
            _id: { $ne: categoryId }, 
        });

        if (existingCategory) {
            const categories = await Category.find({
                name: { $regex: search, $options: 'i' }
            }).skip(skip).limit(limit);
            const totalCategories = await Category.countDocuments({
                name: { $regex: search, $options: 'i' }
            });
            const totalPages = Math.ceil(totalCategories / limit);

            return res.render('adminPanel', {
                body: 'admin/category',
                errorMessage: 'Category name must be unique and case-sensitive.',
                categories,
                search,
                currentpage,
                totalPages,
            });
        }

        await Category.findByIdAndUpdate(categoryId, {
            name: name.trim(),
            description,
            status: status === 'active' ? 'active' : 'inactive',
        });

        res.redirect('/adminPanel/category');
    } catch (err) {
        console.error('Error editing category:', err);

        const categories = await Category.find({
            name: { $regex: search, $options: 'i' }
        }).skip(skip).limit(limit);
        const totalCategories = await Category.countDocuments({
            name: { $regex: search, $options: 'i' }
        });
        const totalPages = Math.ceil(totalCategories / limit);

        res.render('adminPanel', {
            body: 'admin/category',
            errorMessage: 'An unexpected error occurred. Please try again.',
            categories,
            search,
            currentpage,
            totalPages,
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




