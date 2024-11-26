const Offer = require('../models/offer');
const Product= require('../models/productModal')
const Category = require('../models/category')


exports.getOffers = async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const searchOptions = searchQuery ? { title: { $regex: searchQuery, $options: 'i' } } : {};

        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 5; 

        const totalOffers = await Offer.countDocuments(searchOptions);

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

        const normalizedTitle = title.trim().toLowerCase(); 

        const existingOffer = await Offer.findOne({
            title: { $regex: new RegExp('^' + normalizedTitle + '$', 'i') },
        });

        const offers = await Offer.find().sort({ createdAt: -1 });
        const products = await Product.find();
        const categories = await Category.find();

        if (existingOffer) {
            return res.render('adminPanel', {
                body: 'admin/offers',
                offers,
                offer: req.body,
                search: req.body.title,
                currentPage: 1,
                totalPages: 1,
                products,
                categories,
                errorMessage: 'Offer title already exists',
            });
        }

        if (new Date(startDate) >= new Date(endDate)) {
            return res.render('adminPanel', {
                body: 'admin/offers',
                offers,
                offer: req.body,
                search: req.body.title,
                currentPage: 1,
                totalPages: 1,
                products,
                categories,
                errorMessage: 'Start date must be earlier than end date.',
            });
        }

        const newOffer = new Offer({
            title: normalizedTitle,
            offerType,
            relatedId,
            discountType,
            discountValue,
            startDate,
            endDate,
        });

        await newOffer.save();
        res.redirect('/adminPanel/offers');
    } catch (error) {
        console.error('Error adding offer:', error);
        const offers = await Offer.find().sort({ createdAt: -1 });
        const products = await Product.find();
        const categories = await Category.find();

        res.render('adminPanel', {
            body: 'admin/offers',
            offers,
            offer: req.body,
            search: req.body.title,
            currentPage: 1,
            totalPages: 1,
            products,
            categories,
            errorMessage: 'An unexpected error occurred.',
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

        
        const offers = await Offer.find().sort({ createdAt: -1 });
        const products = await Product.find();
        const categories = await Category.find();

        
        const existingOffer = await Offer.findOne({
            title: { $regex: new RegExp('^' + title + '$', 'i') },  
            _id: { $ne: offerId }  
        });

        if (existingOffer) {
            return res.render('adminPanel', {
                body: 'admin/offers',
                offers,
                offer: { ...req.body }, 
                search: req.body.title,
                currentPage: 1,
                totalPages: 1,
                products,
                categories,
                errorMessage: 'Offer title already exists'  
            });
        }

        if (new Date(startDate) >= new Date(endDate)) {
            return res.render('adminPanel', {
                body: 'admin/offers',
                offers,
                offer: req.body,  
                search: req.body.title,
                currentPage: 1,  
                totalPages: 1,  
                products,
                categories,
                errorMessage: 'Start date must be earlier than end date.'
            });
        }

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
 
