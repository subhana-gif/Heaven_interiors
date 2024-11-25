const Order = require('../models/order');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const puppeteer = require('puppeteer');
const excel = require('exceljs');
const {calculateDeliveryCharge} = require('../config/delivery');

exports.getSalesReport = async (req, res) => {


    try {
        let { startDate, endDate } = req.query;

        if (req.query.startDate && req.query.endDate) {
            startDate = new Date(req.query.startDate).toISOString();
            endDate = new Date(req.query.endDate);
            endDate.setUTCDate(endDate.getUTCDate() + 1); 
            endDate = endDate.toISOString();
        } else {
        }
        const salesData = await Order.aggregate([
            { $unwind: "$cartItems" },
            {
                $match: {
                    "cartItems.status": "Delivered",
                    "cartItems.deliveredDate": { $gte: new Date(startDate), $lt: new Date(endDate) }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$cartItems.deliveredDate" } },
                    totalSales: { $sum: "$totalPrice" },
                    totalDiscount: { $sum: { $ifNull: ["$discount", 0] } },
                    couponsDeducted: { $sum: { $ifNull: ["$couponDeduction", 0] } },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const overallTotals = {
            totalSalesCount: salesData.reduce((acc, curr) => acc + curr.totalOrders, 0),
            totalOrderAmount: parseFloat(salesData.reduce((acc, curr) => acc + curr.totalSales, 0).toFixed(2)),
            totalDiscount: parseFloat(salesData.reduce((acc, curr) => acc + curr.totalDiscount, 0).toFixed(2)),
            totalCouponsDeducted: parseFloat(salesData.reduce((acc, curr) => acc + curr.couponsDeducted, 0).toFixed(2)),
        };

        const formattedSalesData = salesData.map(item => ({
            ...item,
            totalSales: parseFloat(item.totalSales.toFixed(2)),
            totalDiscount: parseFloat(item.totalDiscount.toFixed(2)),
            couponsDeducted: parseFloat(item.couponsDeducted.toFixed(2))
        }));

        res.json({ salesData: formattedSalesData, overallTotals });
    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Failed to generate report" });
    }
};



exports.generatePDFReport = async (req, res) => {
    try {
        const salesData = req.body.salesData;

        if (!Array.isArray(salesData)) {
            return res.status(400).json({ error: 'Invalid sales data format. Expected an array.' });
        }

        const html = `
            <h1>Sales Report</h1>
            <table>...</table>
        `;

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for AWS environments
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });

        // Generate PDF as a buffer
        const pdfBuffer = await page.pdf({ format: 'A4' });

        // Close the browser
        await browser.close();

        // Send the PDF to the client
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="salesReport.pdf"');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'An error occurred while generating the PDF' });
    }
};


exports.generateExcelReport = async (req, res) => {
    const salesData = req.body.salesData;

    if (!Array.isArray(salesData)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }

    try {
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total Sales', key: 'totalSales', width: 20 },
            { header: 'Sales Count', key: 'salesCount', width: 15 },
            { header: 'Total Discount', key: 'totalDiscount', width: 20 }
        ];

        salesData.forEach(item => {
            worksheet.addRow({
                date: item._id,
                totalSales: item.totalSales,
                salesCount: item.totalOrders,
                totalDiscount: item.totalDiscount
            });
        });

        const filePath = `SalesReport-${Date.now()}.xlsx`;
        await workbook.xlsx.writeFile(filePath);
        res.download(filePath, () => {
            fs.unlinkSync(filePath); 
        });
    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).send('An error occurred while generating the Excel file');
    }
};

exports.getSalesData = async (req, res) => {
    try {

    const { filter } = req.query; 
    let startDate = new Date();
    let endDate = new Date();
    let dateFormat;

    switch (filter) {
        case 'yearly':
            startDate = new Date(startDate.getFullYear(), 0, 1); 
            dateFormat = "%Y"; 
            break;
        case 'monthly':
            startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1); 
            dateFormat = "%Y-%m";
            break;
        case 'weekly':
            const dayOfWeek = startDate.getDay();
            startDate.setDate(startDate.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            dateFormat = "%Y-%U";
            break;
        default:
            startDate = new Date(startDate.getFullYear(), 0, 1);
            dateFormat = "%Y";
    }

    endDate.setHours(23, 59, 59, 999);

        const salesData = await Order.aggregate([
            { $unwind: "$cartItems" },
            {
                $match: {
                    "cartItems.status": "Delivered",
                    "cartItems.deliveredDate": { $gte: new Date(startDate), $lt: new Date(endDate) }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: "$cartItems.deliveredDate" } },
                    totalSales: { $sum: "$totalPrice" },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json(salesData);
    } catch (error) {
        console.error("Error fetching sales data:", error);
        res.status(500).json({ message: "Error fetching sales data", error });
    }
};

exports.getTopProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            { $unwind: "$cartItems" },
            {
                $group: {
                    _id: "$cartItems.productId",
                    productName: { $first: "$cartItems.name" },
                    totalSales: { $sum: "$cartItems.quantity" }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);
        res.json(topProducts);
            } catch (error) {
                console.error('error getting top products:',error);
                res.status(500).json({ message: "Error fetching top products", error });
    }
};

exports.generateLedger = async (req, res) => {
    try {
        const ledgerData = await Order.find().populate('user').populate('cartItems.productId');

        const doc = new PDFDocument({ margin: 40 });
        const filePath = 'ledger.pdf';

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.fontSize(20).text("Ledger Book", { align: 'center' }).moveDown();

        const tableTop = 150;
        const rowHeight = 35;
        const cellPadding = 5;
        const columnWidths = [80, 120, 70, 70, 80, 80, 80];
        let leftMargin = 10;

        const headers = ["Order ID", "User", "Payment\nMethod", "Total\nPrice", "Offer\nDiscount", "Coupon\nDiscount", "Delivery\nCharge"];
        doc.fontSize(12).font('Helvetica-Bold');

        headers.forEach((header, i) => {
            doc.rect(leftMargin, tableTop, columnWidths[i], rowHeight).stroke(); 
            doc.text(header, leftMargin + cellPadding, tableTop + cellPadding);
            leftMargin += columnWidths[i];
        });

        let rowPosition = tableTop + rowHeight;
        doc.fontSize(10).font('Helvetica');

        ledgerData.forEach(order => {
            const deliveryCharge = calculateDeliveryCharge(order.address.pinCode);
            const rowData = [
                order.orderNumber,
                order.user.username,
                order.paymentMethod,
                parseFloat(order.totalPrice.toFixed(2)),
                parseFloat((order.discount || 0).toFixed(2)),
                parseFloat((order.couponDeduction || 0).toFixed(2)),
                deliveryCharge
            ];

            leftMargin = 10;

            rowData.forEach((data, i) => {
                doc.rect(leftMargin, rowPosition, columnWidths[i], rowHeight).stroke(); 
                doc.text(data, leftMargin + cellPadding, rowPosition + cellPadding);
                leftMargin += columnWidths[i];
            });

            rowPosition += rowHeight;
        });

        doc.end();

        writeStream.on('finish', () => {
            res.download(filePath, 'ledger.pdf', (err) => {
                if (err) {
                    console.error("Error downloading ledger:", err);
                    res.status(500).json({ message: "Error downloading ledger" });
                }
                fs.unlinkSync(filePath); 
            });
        });

        writeStream.on('error', (err) => {
            console.error("Error writing PDF document to file:", err);
            res.status(500).json({ message: "Error generating PDF document" });
        });

    } catch (error) {
        console.error("Error generating ledger:", error);
        res.status(500).json({ message: "Error generating ledger", error });
    }
};

exports.getCategoryWiseSales = async (req, res) => {
    try {
        const salesData = await Order.aggregate([
            { $unwind: "$cartItems" },
            {
                $group: {
                    _id: { $toObjectId: "$cartItems.category" },
                    totalSales: { $sum: "$cartItems.quantity" }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            {
                $unwind: {
                    path: "$categoryDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    name: "$categoryDetails.name", 
                    totalSales: 1
                }
            },
            { $sort: { totalSales: -1 } }
        ]);
        res.json(salesData);
    } catch (error) {
        console.error("Error fetching category-wise sales data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



