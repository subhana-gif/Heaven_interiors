const Wishlist = require('../models/wishlist'); 
const Offer = require('../models/offer')

// Add to Wishlist
exports.addToWishlist = async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id; 

    try {
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [productId] });
        } else {
            if (!wishlist.products.includes(productId)) {
                wishlist.products.push(productId);
            }
        }

        await wishlist.save();

        res.status(200).json({ success: true, message: 'Added to wishlist' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.removeFromWishlist = async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id; 

    try {
        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        // Remove the product from the wishlist
        wishlist.products.pull(productId);
        await wishlist.save();

        res.status(200).json({ success: true, message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// Get Wishlist
exports.getWishlist = async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Current page
    const limit = 4; // Number of items per page
    const skip = (page - 1) * limit;

    try {
        const userId = req.session.user._id;

        // Find the wishlist without pagination first to get the total count
        const wishlist = await Wishlist.findOne({ userId }).lean();
        const totalItems = wishlist.products.length; // Total products in wishlist
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch paginated products with skip and limit
        const paginatedWishlist = await Wishlist.findOne({ userId })
            .populate({
                path: 'products',
                options: { skip, limit },
            })
            .lean();

        // Calculate discounted prices for each product
        const wishlistWithPrices = await Promise.all(paginatedWishlist.products.map(async (product) => {
            const offer = await Offer.findOne({
                $and: [
                    { isDeleted: false },
                    {
                        $or: [
                            { offerType: 'product', relatedId: product._id },
                            { offerType: 'category', relatedId: product.category }
                        ]
                    },
                    { startDate: { $lte: new Date() } },
                    { endDate: { $gte: new Date() } }
                ]
            });

            let discountedPrice = null;
            if (offer) {
                discountedPrice = offer.discountType === 'percentage'
                    ? product.price * (1 - offer.discountValue / 100)
                    : Math.max(0, product.price - offer.discountValue);
            }

            return {
                ...product,
                originalPrice: product.price,
                discountedPrice: discountedPrice ? discountedPrice.toFixed(2) : null
            };
        }));

        // Render the wishlist page with the updated wishlist items
        res.render('userSide/wishlist', { 
            wishlist: wishlistWithPrices, // Paginated products with prices
            totalPages, 
            currentPage: page 
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Server Error');
    }
};

exports.toggleWishlist = async (req, res) => {
    const productId = req.params.productId; 
    const userId = req.user._id;

    try {
        // Find or create a wishlist for the user
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        const isInWishlist = wishlist.products.includes(productId.toString());

        if (isInWishlist) {
            wishlist.products.pull(productId); // Remove from wishlist
        } else {
            wishlist.products.push(productId); // Add to wishlist
        }

        await wishlist.save();

        res.json({ success: true, action: isInWishlist ? 'removed' : 'added' });
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



