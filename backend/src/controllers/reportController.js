const Order = require('../models/Order');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

// Helper to construct tenant & date range match stage
const buildDateMatch = (req, includePaidOnly = true, dateField = 'createdAt') => {
  const match = {
    restaurantId: new mongoose.Types.ObjectId(req.tenantId),
  };

  if (includePaidOnly) {
    match.paymentStatus = 'paid';
  }

  const { startDate, endDate } = req.query;
  if (startDate || endDate) {
    match[dateField] = {};
    if (startDate) {
      match[dateField].$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match[dateField].$lte = end;
    }
  }

  return match;
};

// @desc    Get Sales Report (Total Revenue, Order Count, Daily Trend)
// @route   GET /api/reports/sales?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getSalesReport = async (req, res) => {
  try {
    const matchStage = buildDateMatch(req, true, 'createdAt');

    const dailyTrend = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const overallStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = overallStats.length > 0 ? overallStats[0].totalRevenue : 0;
    const totalOrders = overallStats.length > 0 ? overallStats[0].totalOrders : 0;

    res.status(200).json({
      success: true,
      totalRevenue,
      totalOrders,
      dailyTrend,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Best Selling Items Report
// @route   GET /api/reports/best-sellers?startDate=X&endDate=Y&limit=10
// @access  Private (restaurant-admin)
const getBestSellersReport = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const matchStage = buildDateMatch(req, true, 'createdAt');

    const bestSellers = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantitySold: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: {
              $add: [
                { $multiply: ['$items.price', '$items.quantity'] },
                // Account for item add-ons if any
                {
                  $multiply: [
                    {
                      $reduce: {
                        input: { $ifNull: ['$items.addOns', []] },
                        initialValue: 0,
                        in: { $add: ['$$value', '$$this.price'] },
                      },
                    },
                    '$items.quantity',
                  ],
                },
              ],
            },
          },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: limit },
    ]);

    res.status(200).json({
      success: true,
      count: bestSellers.length,
      data: bestSellers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Order Type Breakdown (Dine-in vs Takeaway vs Delivery)
// @route   GET /api/reports/order-type-breakdown?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getOrderTypeBreakdown = async (req, res) => {
  try {
    // Filtered to paid orders for consistency with all reports
    const matchStage = buildDateMatch(req, true, 'createdAt');

    const breakdown = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$orderType',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
        },
      },
    ]);

    const totalOrders = breakdown.reduce((sum, item) => sum + item.count, 0);

    const formatted = breakdown.map((item) => ({
      orderType: item._id,
      count: item.count,
      totalRevenue: item.totalRevenue,
      percentage: totalOrders > 0 ? Number(((item.count / totalOrders) * 100).toFixed(1)) : 0,
    }));

    res.status(200).json({
      success: true,
      totalOrders,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Payment Method Breakdown (Unwinds paymentBreakdown for exact Cash vs Card split accuracy)
// @route   GET /api/reports/payment-breakdown?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getPaymentBreakdown = async (req, res) => {
  try {
    const matchStage = buildDateMatch(req, true, 'createdAt');

    const breakdown = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$paymentBreakdown' },
      {
        $group: {
          _id: '$paymentBreakdown.method',
          totalAmount: { $sum: '$paymentBreakdown.amount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const grandTotal = breakdown.reduce((sum, item) => sum + item.totalAmount, 0);

    const formatted = breakdown.map((item) => ({
      method: item._id,
      totalAmount: item.totalAmount,
      transactionCount: item.transactionCount,
      percentage: grandTotal > 0 ? Number(((item.totalAmount / grandTotal) * 100).toFixed(1)) : 0,
    }));

    res.status(200).json({
      success: true,
      grandTotal,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Expense vs Revenue Overview (Profit / Loss)
// @route   GET /api/reports/profit-loss?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getProfitLossReport = async (req, res) => {
  try {
    const orderMatch = buildDateMatch(req, true, 'createdAt');
    const expenseMatch = buildDateMatch(req, false, 'date'); // Uses Expense model's custom 'date' field

    const revenueResult = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
        },
      },
    ]);

    const expenseResult = await Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
        },
      },
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const totalExpenses = expenseResult.length > 0 ? expenseResult[0].totalExpenses : 0;
    const netProfit = totalRevenue - totalExpenses;

    res.status(200).json({
      success: true,
      totalRevenue,
      totalExpenses,
      netProfit,
      isProfitable: netProfit >= 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSalesReport,
  getBestSellersReport,
  getOrderTypeBreakdown,
  getPaymentBreakdown,
  getProfitLossReport,
};
