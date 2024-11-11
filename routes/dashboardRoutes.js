const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/sales-report', dashboardController.getSalesReport);
router.post('/report/pdf', dashboardController.generatePDFReport);
router.post('/report/excel', dashboardController.generateExcelReport);
router.get('/sales-data', dashboardController.getSalesData);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/top-categories', dashboardController.getTopCategories);
router.get('/ledger', dashboardController.generateLedger);


module.exports = router;
