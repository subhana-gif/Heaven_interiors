const Category = require('../models/category');

exports.renderCategoryPage =async (req, res) => {
    try{
    const search = req.query.search || ''; // Get the search query from the request
    const currentpage = parseInt(req.query.page) || 1; // Get the current page, default to 1 if not provided
    const limit = 10; // Define how many categories to show per page
    const skip=(currentpage-1)*limit;
    const categories=await  Category.find({ 
        name: { $regex: search, $options: 'i' }

    }).skip(skip).limit(limit);
    const totalCategories = await Category.countDocuments({
        name: { $regex: search, $options: 'i' }
    });
    const totalPages=Math.ceil(totalCategories/limit);
                    res.render('adminPanel', { 
                        body: 'admin/category',
                        categories, 
                        search, 
                        currentpage,
                        totalPages
                    });
    } catch (error) {
        console.error("Error in renderProductPage:", error);
        res.status(500).send('Server Error');
    }
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




