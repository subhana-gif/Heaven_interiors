const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const userProductController=require('../controllers/userProductController')

router.get('/search/suggestions',searchController.getSearchSuggestions);
router.get('/search',searchController.getSearchResults);
router.get('/products/:id',userProductController.viewProduct); 

module.exports = router;
