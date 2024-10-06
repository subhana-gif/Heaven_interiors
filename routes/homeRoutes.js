const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const {checkUserBlocked } = require('../middleware/authUserMiddleware'); 

router.get('/home', checkUserBlocked,homeController.renderHomePage);
router.get('/categories', checkUserBlocked,homeController.fetchCategories);
router.get('/products',checkUserBlocked, homeController.fetchProducts);

module.exports = router;
    