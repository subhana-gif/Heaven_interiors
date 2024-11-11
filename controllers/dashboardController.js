const Order = require('../models/order');
const pdf = require('html-pdf');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const excel = require('exceljs');
const {calculateDeliveryCharge} = require('../config/delivery');

exports.getSalesReport = async (req, res) => {
    let { startDate, endDate } = req.query;

    // Calculate start and end dates if provided
    if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate).toISOString();
        endDate = new Date(req.query.endDate);
        endDate.setUTCDate(endDate.getUTCDate() + 1); // Increment by one day
        endDate = endDate.toISOString();
    } else {
        console.log("No valid date range provided.");
    }

    try {
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

        // Calculate overall totals and format them to two decimal places
        const overallTotals = {
            totalSalesCount: salesData.reduce((acc, curr) => acc + curr.totalOrders, 0),
            totalOrderAmount: parseFloat(salesData.reduce((acc, curr) => acc + curr.totalSales, 0).toFixed(2)),
            totalDiscount: parseFloat(salesData.reduce((acc, curr) => acc + curr.totalDiscount, 0).toFixed(2)),
            totalCouponsDeducted: parseFloat(salesData.reduce((acc, curr) => acc + curr.couponsDeducted, 0).toFixed(2)),
        };

        // Format each item in salesData with two decimal places
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
    const salesData = req.body.salesData;

    // Check if salesData is valid
    if (!Array.isArray(salesData)) {
        return res.status(400).json({ error: 'Invalid sales data format. Expected an array.' });
    }

    try {
        // Define the HTML content with inline styling for the PDF table
        const html = `
            <h1 style="text-align: center; font-family: Arial, sans-serif;">Sales Report</h1>
            <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2;">Date</th>
                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2;">Total Sales</th>
                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2;">Sales Count</th>
                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2;">Total Discount</th>
                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2;">Coupon Deductions</th>
                    </tr>
                </thead>
                <tbody>
                    ${salesData.map(item => `
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px;">${item._id || 'N/A'}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${(item.totalSales || 0).toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${item.totalOrders || 0}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${(item.totalDiscount || 0).toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right;">${(item.couponsDeducted || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Create the PDF with the styled HTML table
        pdf.create(html).toFile('salesReport.pdf', (err, result) => {
            if (err) {
                console.error('Error creating PDF:', err);
                return res.status(500).json({ error: 'Failed to create PDF' });
            }
            res.sendFile(result.filename, (err) => {
                if (err) {
                    console.error('Error sending PDF:', err);
                    res.status(500).send('Failed to send PDF');
                }
            });
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'An error occurred while generating the PDF' });
    }
};

exports.generateExcelReport = async (req, res) => {
    const salesData = req.body.salesData; // Extract the salesData from the request body

    // Log the data for debugging

    // Check if salesData is an array
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

        // Add rows to worksheet
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
            fs.unlinkSync(filePath); // Optionally delete the file after download
        });
    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).send('An error occurred while generating the Excel file');
    }
};

exports.getSalesData = async (req, res) => {
    const { filter } = req.query; 
    let startDate = new Date();
    let endDate = new Date();
    let dateFormat;

    // Calculate the start and end dates based on the filter
    switch (filter) {
        case 'yearly':
            startDate = new Date(startDate.getFullYear(), 0, 1); // January 1st of the current year
            dateFormat = "%Y"; // Yearly format
            break;
        case 'monthly':
            startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1); // First day of the current month
            dateFormat = "%Y-%m"; // Monthly format
            break;
        case 'weekly':
            const dayOfWeek = startDate.getDay();
            startDate.setDate(startDate.getDate() - dayOfWeek); // Move to the start of the week
            startDate.setHours(0, 0, 0, 0);
            dateFormat = "%Y-%U"; // Weekly format
            break;
        default:
            // Default to yearly
            startDate = new Date(startDate.getFullYear(), 0, 1);
            dateFormat = "%Y";
    }

    // Set endDate to the end of the day
    endDate.setHours(23, 59, 59, 999);

    try {
        // Aggregate data based on the date range and grouping format
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
        console.log('salesDate:',salesData);
        
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
        res.status(500).json({ message: "Error fetching top products", error });
    }
};

exports.getTopCategories = async (req, res) => {
    try {
        const topCategories = await Order.aggregate([
            { $unwind: "$cartItems" },
            {
                $group: {
                    _id: { $toObjectId: "$cartItems.category" }, // Convert string to ObjectId
                    totalSales: { $sum: "$cartItems.quantity" }
                }
            },
            {
                $lookup: {
                    from: 'categories', // The collection name for categories
                    localField: '_id', // Grouped category ID
                    foreignField: '_id', // Field in categories
                    as: 'categoryDetails' // Output array name
                }
            },
            {
                $unwind: {
                    path: "$categoryDetails",
                    preserveNullAndEmptyArrays: true // Keep unmatched results
                }
            },
            {
                $project: {
                    _id: 1,
                    name: "$categoryDetails.name", // Access the category name
                    totalSales: 1
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        res.json(topCategories);
    } catch (error) {
        console.error("Error fetching top categories:", error);
        res.status(500).json({ message: "Error fetching top categories", error });
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

        // Table layout settings
        const tableTop = 150;
        const rowHeight = 35;
        const cellPadding = 5;
        const columnWidths = [80, 120, 70, 70, 80, 80, 80]; // Set each column width
        let leftMargin = 10;

        const headers = ["Order ID", "User", "Payment\nMethod", "Total\nPrice", "Offer\nDiscount", "Coupon\nDiscount", "Delivery\nCharge"];
        doc.fontSize(12).font('Helvetica-Bold');

        headers.forEach((header, i) => {
            doc.rect(leftMargin, tableTop, columnWidths[i], rowHeight).stroke(); // Draw rectangle for each header cell
            doc.text(header, leftMargin + cellPadding, tableTop + cellPadding);
            leftMargin += columnWidths[i];
        });

        // Draw a border below the header row
        // doc.moveTo(40, tableTop + rowHeight).lineTo(40 + columnWidths.reduce((a, b) => a + b), tableTop + rowHeight).stroke();

        // Populate rows with data and draw borders for each cell
        let rowPosition = tableTop + rowHeight; // Start position for the first row
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

            leftMargin = 10; // Reset left margin for each row

            rowData.forEach((data, i) => {
                doc.rect(leftMargin, rowPosition, columnWidths[i], rowHeight).stroke(); // Draw border for each cell
                doc.text(data, leftMargin + cellPadding, rowPosition + cellPadding); // Add cell text with padding
                leftMargin += columnWidths[i];
            });

            rowPosition += rowHeight; // Move down for the next row
        });

        doc.end();

        writeStream.on('finish', () => {
            res.download(filePath, 'ledger.pdf', (err) => {
                if (err) {
                    console.error("Error downloading ledger:", err);
                    res.status(500).json({ message: "Error downloading ledger" });
                }
                fs.unlinkSync(filePath); // Clean up the file after sending
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

