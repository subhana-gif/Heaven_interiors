const Order = require('../models/order');
const pdf = require('html-pdf');
const fs = require('fs');
const excel = require('exceljs');

exports.getSalesReport = async (req, res) => {
    let { startDate, endDate } = req.query;

    // If "Daily" is selected, calculate today's date boundaries in UTC
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
            {
                $match: {
                    deliveredDate: { $gte: new Date(startDate), $lt: new Date(endDate) }, // Matching deliveredDate for daily report
                    status: 'Delivered'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredDate" } },
                    totalSales: { $sum: "$totalPrice" },
                    totalDiscount: { $sum: { $ifNull: ["$discount", 0] } },
                    couponsDeducted: { $sum: { $ifNull: ["$couponDeduction", 0] } },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // Sort by date ascending
        ]);


        const overallTotals = {
            totalSalesCount: salesData.reduce((acc, curr) => acc + curr.totalOrders, 0),
            totalOrderAmount: salesData.reduce((acc, curr) => acc + curr.totalSales, 0),
            totalDiscount: salesData.reduce((acc, curr) => acc + curr.totalDiscount, 0),
            totalCouponsDeducted: salesData.reduce((acc, curr) => acc + curr.couponsDeducted, 0),
        };

        // Log the overall totals calculated

        res.json({ salesData, overallTotals });
    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Failed to generate report" });
    }
};


exports.generatePDFReport = async (req, res) => {
    const salesData=req.body.salesData

    // Check if salesData is valid
    if (!Array.isArray(salesData)) {
        return res.status(400).json({ error: 'Invalid sales data format. Expected an array.' });
    }

    try {
        
        const html = `
            <h1>Sales Report</h1>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Total Sales</th>
                        <th>Sales Count</th>
                        <th>Total Discount</th>
                        <th>Coupon Deductions</th>
                    </tr>
                </thead>
                <tbody>
                    ${salesData.map(item => `
                        <tr>
                            <td>${item._id || 'N/A'}</td>
                            <td>${item.totalSales || 0}</td>
                            <td>${item.totalOrders || 0}</td>
                            <td>${item.totalDiscount || 0}</td>
                            <td>${item.couponsDeducted || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        pdf.create(html).toFile('salesReport.pdf', (err, result) => {
            if (err) {
                console.error('Error creating PDF:', err);
                return res.status(500).json({ error: 'Failed to create PDF' });
            }
            console.log('PDF created successfully:', result.filename);
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


// Function to generate Excel report
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

