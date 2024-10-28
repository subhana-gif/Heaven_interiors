const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Route to get the sales report
router.get('/sales-report', dashboardController.getSalesReport);

// Route to generate PDF report
router.post('/report/pdf', dashboardController.generatePDFReport);

// Route to generate Excel report
router.post('/report/excel', dashboardController.generateExcelReport);

module.exports = router;
