const Offer = require('../models/offer');
const Product= require('../models/productModal')
const Category = require('../models/category')


exports.getOffers = async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const searchOptions = searchQuery ? { title: { $regex: searchQuery, $options: 'i' } } : {};

        const page = parseInt(req.query.page) || 1; // Current page, default is 1
        const itemsPerPage = 5; // Number of items per page

        // Get total number of offers matching the search
        const totalOffers = await Offer.countDocuments(searchOptions);

        // Fetch offers for the current page
        const offers = await Offer.find(searchOptions)
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage).sort({createdAt:-1});

        const totalPages = Math.ceil(totalOffers / itemsPerPage); 
        const products = await Product.find({});
        const categories = await Category.find({}); 
        
        const offerId = req.query.id; 
        let selectedOffer = null;

        if (offerId) {
            selectedOffer = await Offer.findById(offerId);
        }
        let errorMessage = '';
        
        // Render the view with pagination data
        res.render('adminPanel', {
            body: 'admin/offers',
            offers,
            offer: selectedOffer, 
            search: searchQuery,
            currentPage: page,
            totalPages,
            products,
            categories,
            errorMessage,
        });
    } catch (error) {
        console.error('Error fetching offers:', error);
        res.status(500).send('Server Error');
    }
};

exports.addOffer = async (req, res) => {
    try {
        const {
            title,
            offerType,
            relatedId,
            discountType,
            discountValue,
            startDate,
            endDate,
        } = req.body;
        const offers = await Offer.find().sort({createdAt:-1});
        const products = await Product.find();
        const categories = await Category.find();

        const existingOffer = await Offer.findOne({
            title: { $regex: new RegExp('^' + title + '$', 'i') },  // Case-insensitive regex search
        });

        if (existingOffer) {
            res.render('adminPanel', {
                body: 'admin/offers',
                offers,
                offer: req.body,  // Send the entered data back so the form isn't reset
                search: req.body.title,
                currentPage: 1,  // Default to page 1 if an error occurs
                totalPages: 1,   // You can adjust this if you're paginating offers
                products,
                categories,
                errorMessage: 'offer title already exists'  
            });
            }

        const newOffer = new Offer({
            title,
            offerType,
            relatedId,
            discountType,
            discountValue,
            startDate,
            endDate,
        });    

        if (new Date(startDate) >= new Date(endDate)) {
            const offers = await Offer.find().sort({createdAt:-1});
            const products = await Product.find();
            const categories = await Category.find();
            return res.render('adminPanel', {
                body: 'admin/offers',
                offers,
                offer: req.body,  // Send the entered data back so the form isn't reset
                search: req.body.title,
                currentPage: 1,  // Default to page 1 if an error occurs
                totalPages: 1,   // You can adjust this if you're paginating offers
                products,
                categories,
                errorMessage: 'Start date must be earlier than end date.'
            });
        }

        await newOffer.save();
        res.redirect('/adminPanel/offers');
    } catch (error) {
        const offers = await Offer.find().sort({createdAt:-1});
        const products = await Product.find();
        const categories = await Category.find();
        console.error('Error adding offer:', error);
        res.render('adminPanel', {
            body: 'admin/offers',
            offers,
            offer: req.body,  // Send the entered data back so the form isn't reset
            search: req.body.title,
            currentPage: 1,  // Default to page 1 if an error occurs
            totalPages: 1,   // You can adjust this if you're paginating offers
            products,
            categories,
            errorMessage: 'Offer name already exists'  // Pass the error message to be displayed
        });
    }
};

exports.editOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        const {
            title,
            offerType,
            relatedId,
            discountType,
            discountValue,
            startDate,
            endDate,
        } = req.body;

        // Fetch existing offers, products, and categories for rendering the page
        const offers = await Offer.find().sort({ createdAt: -1 });
        const products = await Product.find();
        const categories = await Category.find();

        // Normalize the title to lowercase for case-insensitive comparison and check if title already exists
        const existingOffer = await Offer.findOne({
            title: { $regex: new RegExp('^' + title + '$', 'i') },  // Case-insensitive regex search
            _id: { $ne: offerId }  // Ensure it's not the current offer being edited
        });

        if (existingOffer) {
            return res.render('adminPanel', {
                body: 'admin/offers',
                offers,
                offer: { ...req.body },  // Retain form data and offer ID
                search: req.body.title,
                currentPage: 1,
                totalPages: 1,
                products,
                categories,
                errorMessage: 'Offer title already exists'  // Display error message
            });
        }

        // Check that the start date is earlier than the end date
        if (new Date(startDate) >= new Date(endDate)) {
            return res.render('adminPanel', {
                body: 'admin/offers',
                offers,
                offer: req.body,  // Send the entered data back so the form isn't reset
                search: req.body.title,
                currentPage: 1,  // Default to page 1 if an error occurs
                totalPages: 1,   // You can adjust this if you're paginating offers
                products,
                categories,
                errorMessage: 'Start date must be earlier than end date.'
            });
        }

        // Update the offer if validation passes
        await Offer.findByIdAndUpdate(offerId, {
            title,
            offerType,
            relatedId,
            discountType,
            discountValue,
            startDate,
            endDate,
        });

        res.redirect('/adminPanel/offers');
    } catch (error) {
        console.error('Error updating offer:', error);
        const offers = await Offer.find().sort({ createdAt: -1 });
        const products = await Product.find();
        const categories = await Category.find();

        res.render('adminPanel', {
            body: 'admin/offers',
            offers,
            search: req.body.title,
            currentPage: 1,
            totalPages: 1,
            products,
            categories,
            errorMessage: 'Error updating the offer. Please try again.' 
        });
    }
};

exports.softDeleteOffer = async (req, res) => {
    const { id } = req.params;
    try {
        await Offer.findByIdAndUpdate(id, { isDeleted: true });
        res.redirect('/adminPanel/offers');
    } catch (error) {
        console.error('Error soft deleting offer:', error);
        res.status(500).send('Server Error');
    }
};

exports.restoreOffer = async (req, res) => {
    const { id } = req.params;
    try {
        await Offer.findByIdAndUpdate(id, { isDeleted: false });
        res.redirect('/adminPanel/offers');
    } catch (error) {
        console.error('Error restoring offer:', error);
        res.status(500).send('Server Error');
    }
};
 
