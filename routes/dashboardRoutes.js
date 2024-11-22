const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const {isAdminAuthenticated}=require('../middleware/authMiddleware')

router.get('/sales-report',isAdminAuthenticated,dashboardController.getSalesReport);
router.post('/report/pdf',isAdminAuthenticated,dashboardController.generatePDFReport);
router.post('/report/excel',isAdminAuthenticated,dashboardController.generateExcelReport);
router.get('/sales-data',isAdminAuthenticated,dashboardController.getSalesData);
router.get('/top-products',isAdminAuthenticated,dashboardController.getTopProducts);
router.get('/ledger',isAdminAuthenticated,dashboardController.generateLedger);
router.get('/categoryChart',isAdminAuthenticated,dashboardController.getCategoryWiseSales)

module.exports = router;
