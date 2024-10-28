const Offer = require('../models/offer');
const Product= require('../models/productModal')
const Category = require('../models/category')


exports.getOffers = async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const searchOptions = searchQuery ? { title: { $regex: searchQuery, $options: 'i' } } : {};

        const page = parseInt(req.query.page) || 1; // Current page, default is 1
        const itemsPerPage = 10; // Number of items per page

        // Get total number of offers matching the search
        const totalOffers = await Offer.countDocuments(searchOptions);

        // Fetch offers for the current page
        const offers = await Offer.find(searchOptions)
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        const totalPages = Math.ceil(totalOffers / itemsPerPage); 
        const products = await Product.find({});
        const categories = await Category.find({}); 
        
        const offerId = req.query.id; 
        let selectedOffer = null;

        if (offerId) {
            selectedOffer = await Offer.findById(offerId);
        }
        
        // Render the view with pagination data
        res.render('adminPanel', {
            body: 'admin/offers',
            offers,
            offer: selectedOffer, 
            search: searchQuery,
            currentPage: page,
            totalPages,
            products,
            categories
        });
    } catch (error) {
        console.error('Error fetching offers:', error);
        res.status(500).send('Server Error');
    }
};


// Controller for adding a new offer
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
            referralCode,
            referrerReward,
            refereeReward
        } = req.body;

        const existingOffer = await Offer.findOne({ offerType, relatedId });

        if (existingOffer) {
            return res.status(400).send('An offer already exists for this product or category.');
        }
        const newOffer = new Offer({
            title,
            offerType,
            relatedId,
            discountType,
            discountValue,
            startDate,
            endDate,
            referralCode,
            referrerReward,
            refereeReward
        });

        await newOffer.save();
        res.redirect('/adminPanel/offers');
    } catch (error) {
        console.error('Error adding offer:', error);
        res.status(500).send('Server Error');
    }
};

// Controller for editing an existing offer
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
            referralCode,
            referrerReward,
            refereeReward
        } = req.body;

        const updatedOffer = {
            title,
            offerType,
            relatedId,
            discountType,
            discountValue,
            startDate,
            endDate,
            referralCode,
            referrerReward,
            refereeReward
        };

        await Offer.findByIdAndUpdate(offerId, updatedOffer);
        res.redirect('/adminPanel/offers');
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).send('Server Error');
    }
};

// Controller for deleting an offer
exports.deleteOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        await Offer.findByIdAndDelete(offerId);
        res.redirect('/adminPanel/offers');
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).send('Server Error');
    }
};
