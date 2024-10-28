const Wishlist = require('../models/wishlist'); 
const User = require('../models/User')

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
    const userId = req.user._id; 

    try {
        const wishlist = await Wishlist.findOne({ userId }).populate('products');
        if (!wishlist) {
            return res.render('userSide/wishlist', { wishlist: [] });
        }

        res.render('userSide/wishlist', { wishlist: wishlist.products });    
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ message: 'Server error' });
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



