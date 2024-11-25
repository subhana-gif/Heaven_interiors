const Wallet = require('../models/wallet')

exports.renderWalletPage = async (req, res) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1; 
    const pageSize = 5;  

    try {
        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.render('userSide/wallet', { walletBalance: 0, transactions: [], currentPage: page, totalPages: 1 });
        }

        const walletBalance = wallet.balance || 0;

        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / pageSize); 

        const transactions = wallet.transactions
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice((page - 1) * pageSize, page * pageSize);  

        res.render('userSide/wallet', { 
            walletBalance, 
            transactions, 
            currentPage: page, 
            totalPages 
        });
    } catch (error) {
        console.error('Error fetching wallet data:', error);
        res.status(500).send("Internal Server Error");
    }
};


exports.getWalletBalance = async (req, res) => {
    const userId = req.user._id;

    try {
        const wallet = await Wallet.findOne({ userId });
        const balance = wallet ? wallet.balance : 0;
        res.status(200).json({ walletBalance: balance });
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getWalletTransactions = async (req, res) => {
    const userId = req.user._id;

    try {
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }
        const transactions = wallet.transactions || [];
        res.status(200).json({ transactions });
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.applyWallet = async (req, res) => {
    const userId = req.user._id;
    const useWallet = req.body.useWallet;

    try {
        const wallet = await Wallet.findOne({ userId });

        if (!wallet || wallet.balance <= 0 || !useWallet) {
            return res.json({ success: false, message: "Insufficient wallet balance or wallet not used." });
        }

        let totalPrice = req.session.discountedPrice || req.session.totalPrice || 0;
        let walletDeduction = 0;
        let remainingAmount = totalPrice;

        if (wallet.balance >= totalPrice) {
            walletDeduction = totalPrice;
            remainingAmount = 0;
        } else {
            walletDeduction = wallet.balance;
            remainingAmount = totalPrice - wallet.balance;
        }

        req.session.walletDeduction = walletDeduction;
        req.session.remainingAmount = remainingAmount;
        
        res.json({ success: true, newTotalPrice: remainingAmount });
    } catch (error) {
        console.error('Error applying wallet:', error);
        res.status(500).json({ success: false, message: 'Error applying wallet.' });
    }
};




