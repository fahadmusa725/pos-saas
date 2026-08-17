const Order = require('../models/Order');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const PurchaseOrder = require('../models/PurchaseOrder');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to construct tenant & date range match stage
const buildDateMatch = (req, includePaidOnly = true, dateField = 'createdAt') => {
  const match = {};
  if (req.tenantId) {
    try {
      match.restaurantId = new mongoose.Types.ObjectId(req.tenantId);
    } catch (e) {
      match.restaurantId = req.tenantId;
    }
  }

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

// @desc    Get Best Selling Items Report (Top 15)
// @route   GET /api/reports/best-sellers?startDate=X&endDate=Y&limit=15
// @access  Private (restaurant-admin)
const getBestSellersReport = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 15;
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
      {
        $addFields: {
          avgPrice: {
            $cond: [
              { $gt: ['$quantitySold', 0] },
              { $divide: ['$totalRevenue', '$quantitySold'] },
              0,
            ],
          },
        },
      },
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

// @desc    Get Payment Method Breakdown — uses $unwind on paymentBreakdown for split-payment accuracy
// @route   GET /api/reports/payment-breakdown?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getPaymentBreakdown = async (req, res) => {
  try {
    const matchStage = buildDateMatch(req, true, 'createdAt');

    // NOTE: $unwind paymentBreakdown array ensures split-payment orders
    // (e.g. part cash + part card) are counted accurately per method —
    // not lumped under the top-level paymentMethod field.
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
    const expenseMatch = buildDateMatch(req, false, 'date');

    const revenueResult = await Order.aggregate([
      { $match: orderMatch },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
    ]);

    const expenseResult = await Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    const totalExpenses = expenseResult[0]?.totalExpenses || 0;
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

// ─────────────────────────────────────────────────────────────────────────────
// NEW ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Financial Overview — full ledger for Tab 1 & Tab 2
// @route   GET /api/reports/financial-overview?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getFinancialOverview = async (req, res) => {
  try {
    const orderMatch = buildDateMatch(req, true, 'createdAt');
    const expenseMatch = buildDateMatch(req, false, 'date');
    let restaurantId = req.tenantId;
    try {
      if (req.tenantId) restaurantId = new mongoose.Types.ObjectId(req.tenantId);
    } catch (e) {}

    // Total sales revenue + order count
    const salesAgg = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: null,
          totalSalesRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    // Payment-method breakdown via $unwind — split-payment accurate
    const paymentAgg = await Order.aggregate([
      { $match: orderMatch },
      { $unwind: '$paymentBreakdown' },
      {
        $group: {
          _id: '$paymentBreakdown.method',
          total: { $sum: '$paymentBreakdown.amount' },
        },
      },
    ]);

    const paymentMap = {};
    paymentAgg.forEach((p) => { paymentMap[p._id] = p.total; });

    const cashSales = paymentMap['cash'] || 0;
    const cardSales = paymentMap['card'] || 0;
    const creditSales = paymentMap['credit'] || 0;
    const onlineSales = paymentMap['online'] || 0;

    // Total expenses
    const expenseAgg = await Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);

    // Accounts receivable = outstanding customer credit balances (all-time)
    const arAgg = await Customer.aggregate([
      { $match: { restaurantId } },
      { $group: { _id: null, accountsReceivable: { $sum: '$creditBalance' } } },
    ]);

    // Accounts payable = unpaid purchase order balances
    const apAgg = await PurchaseOrder.aggregate([
      {
        $match: {
          restaurantId,
          paymentStatus: { $in: ['unpaid', 'partially_paid'] },
        },
      },
      {
        $group: {
          _id: null,
          accountsPayable: { $sum: { $subtract: ['$totalCost', '$amountPaid'] } },
        },
      },
    ]);

    // Daily revenue trend for chart
    const dailyTrend = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalSalesRevenue = salesAgg[0]?.totalSalesRevenue || 0;
    const totalOrders = salesAgg[0]?.totalOrders || 0;
    const totalExpenses = expenseAgg[0]?.totalExpenses || 0;
    const accountsReceivable = arAgg[0]?.accountsReceivable || 0;
    const accountsPayable = apAgg[0]?.accountsPayable || 0;
    const netProfit = totalSalesRevenue - totalExpenses;
    // Estimated cash register = cash sales + credit payments collected - cash expenses
    const cashInRegister = cashSales + creditSales - totalExpenses;

    res.status(200).json({
      success: true,
      totalSalesRevenue,
      totalOrders,
      totalCashSales: cashSales,  // "Total Cash Sales" — cash-method only, not drawer count
      cardSales,
      creditSales,
      onlineSales,
      accountsReceivable,
      accountsPayable,
      totalExpenses,
      netProfit,
      cashInRegister,
      dailyTrend,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Category Sales Report — uses MenuItem.categoryId ref
// @route   GET /api/reports/category-sales?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getCategorySalesReport = async (req, res) => {
  try {
    const matchStage = buildDateMatch(req, true, 'createdAt');
    const orders = await Order.find(matchStage).lean();

    const MenuItem = require('../models/MenuItem');
    const Category = require('../models/Category');

    const menuItems = await MenuItem.find({ restaurantId: req.tenantId }).lean();
    const menuItemLookup = {};
    menuItems.forEach((m) => {
      menuItemLookup[m._id.toString()] = m.categoryId ? m.categoryId.toString() : null;
    });

    const categories = await Category.find({ restaurantId: req.tenantId }).lean();
    const catNameLookup = {};
    categories.forEach((c) => {
      catNameLookup[c._id.toString()] = c.name;
    });

    const categoryMap = {}; // { categoryId: { categoryName, totalRevenue, itemsSold } }

    for (const order of orders) {
      if (!Array.isArray(order.items)) continue;
      for (const item of order.items) {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const itemRevenue = price * qty;

        // Try item.categoryId, or lookup via menuItemId
        let catKey = item.categoryId ? item.categoryId.toString() : null;
        if (!catKey && item.menuItemId) {
          catKey = menuItemLookup[item.menuItemId.toString()] || null;
        }
        if (!catKey) catKey = 'uncategorized';

        if (!categoryMap[catKey]) {
          categoryMap[catKey] = {
            categoryId: catKey,
            categoryName: catNameLookup[catKey] || 'Uncategorized',
            totalRevenue: 0,
            itemsSold: 0,
          };
        }
        categoryMap[catKey].totalRevenue += itemRevenue;
        categoryMap[catKey].itemsSold += qty;
      }
    }

    const formattedList = Object.values(categoryMap);
    formattedList.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const grandTotal = formattedList.reduce((sum, c) => sum + c.totalRevenue, 0);
    const data = formattedList.map((c) => ({
      ...c,
      percentage: grandTotal > 0 ? Number(((c.totalRevenue / grandTotal) * 100).toFixed(1)) : 0,
    }));

    res.status(200).json({ success: true, grandTotal, data });
  } catch (error) {
    console.error('getCategorySalesReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Peak Hours Report — 24-hour order distribution
// @route   GET /api/reports/peak-hours?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getPeakHoursReport = async (req, res) => {
  try {
    const matchStage = buildDateMatch(req, true, 'createdAt');
    const orders = await Order.find(matchStage, { createdAt: 1, total: 1 }).lean();

    const hourMap = {};
    orders.forEach(o => {
      if (!o.createdAt) return;
      const h = new Date(o.createdAt).getHours();
      if (!hourMap[h]) hourMap[h] = { orderCount: 0, totalRevenue: 0 };
      hourMap[h].orderCount += 1;
      hourMap[h].totalRevenue += (Number(o.total) || 0);
    });

    const full24Hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
      orderCount: hourMap[i]?.orderCount || 0,
      totalRevenue: hourMap[i]?.totalRevenue || 0,
    }));

    res.status(200).json({ success: true, data: full24Hours });
  } catch (error) {
    console.error('getPeakHoursReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Staff Performance Leaderboard
// @route   GET /api/reports/staff-performance?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getStaffPerformanceReport = async (req, res) => {
  try {
    const matchStage = buildDateMatch(req, true, 'createdAt');
    const orders = await Order.find(matchStage, { createdBy: 1, total: 1 }).lean();

    const staffMap = {};
    orders.forEach(o => {
      const staffKey = o.createdBy ? o.createdBy.toString() : 'unassigned';
      if (!staffMap[staffKey]) {
        staffMap[staffKey] = {
          staffId: staffKey,
          ordersProcessed: 0,
          totalSalesGenerated: 0,
        };
      }
      staffMap[staffKey].ordersProcessed += 1;
      staffMap[staffKey].totalSalesGenerated += (Number(o.total) || 0);
    });

    // Populate user info
    const users = await User.find({}, { name: 1, email: 1, role: 1 }).lean();
    const userLookup = {};
    users.forEach(u => { userLookup[u._id.toString()] = u; });

    const formatted = Object.values(staffMap).map(s => {
      const userInfo = userLookup[s.staffId] || {};
      let name = userInfo.name || 'Salman Cafe Admin';
      if (name.toLowerCase().includes('lahore karahi')) {
        name = name.replace(/lahore karahi point/gi, 'Salman Cafe').replace(/lahore karahi/gi, 'Salman Cafe');
      }
      return {
        ...s,
        staffName: name,
        email: userInfo.email || '',
        role: userInfo.role || 'staff',
        avgOrderValue: s.ordersProcessed > 0 ? Number((s.totalSalesGenerated / s.ordersProcessed).toFixed(2)) : 0,
      };
    });

    formatted.sort((a, b) => b.totalSalesGenerated - a.totalSalesGenerated);

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('getStaffPerformanceReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Customer Report — Top spenders + outstanding credit (udhar)
// @route   GET /api/reports/customer-report?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getCustomerReport = async (req, res) => {
  try {
    const orderMatch = buildDateMatch(req, true, 'createdAt');
    let restaurantId = req.tenantId;
    if (req.tenantId && mongoose.Types.ObjectId.isValid(req.tenantId)) {
      restaurantId = new mongoose.Types.ObjectId(req.tenantId);
    }

    const orders = await Order.find(orderMatch).lean();
    const customerMap = {};

    orders.forEach(o => {
      if (!o.customerId) return;
      const cKey = o.customerId.toString();
      if (!customerMap[cKey]) {
        customerMap[cKey] = { customerId: cKey, totalSpent: 0, orderCount: 0 };
      }
      customerMap[cKey].totalSpent += (Number(o.total) || 0);
      customerMap[cKey].orderCount += 1;
    });

    const customers = await Customer.find({ restaurantId }).lean();
    const custLookup = {};
    customers.forEach(c => { custLookup[c._id.toString()] = c; });

    const topSpenders = Object.values(customerMap).map(c => {
      const info = custLookup[c.customerId] || {};
      return {
        ...c,
        name: info.name || 'Customer',
        phone: info.phone || '',
        avgOrderValue: c.orderCount > 0 ? Number((c.totalSpent / c.orderCount).toFixed(2)) : 0,
      };
    });
    topSpenders.sort((a, b) => b.totalSpent - a.totalSpent);

    // Customers with outstanding credit balance (udhar)
    const outstandingCredit = customers
      .filter(c => Number(c.creditBalance) > 0)
      .map(c => ({ _id: c._id, name: c.name, phone: c.phone, creditBalance: c.creditBalance }))
      .sort((a, b) => b.creditBalance - a.creditBalance);

    const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.creditBalance) || 0), 0);

    // Calculate credit given out from orders
    let totalCreditGiven = 0;
    orders.forEach(o => {
      if (Array.isArray(o.paymentBreakdown)) {
        o.paymentBreakdown.forEach(p => {
          if (p.method === 'credit') totalCreditGiven += (Number(p.amount) || 0);
        });
      }
    });

    res.status(200).json({
      success: true,
      topSpenders: topSpenders.slice(0, 20),
      outstandingCredit,
      summary: {
        totalCreditGiven,
        totalOutstanding,
        creditSettled: Math.max(0, totalCreditGiven - totalOutstanding),
      },
    });
  } catch (error) {
    console.error('getCustomerReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Supplier Report — Purchase volume + outstanding per supplier
// @route   GET /api/reports/supplier-report?startDate=X&endDate=Y
// @access  Private (restaurant-admin)
const getSupplierReport = async (req, res) => {
  try {
    let restaurantId = req.tenantId;
    if (req.tenantId && mongoose.Types.ObjectId.isValid(req.tenantId)) {
      restaurantId = new mongoose.Types.ObjectId(req.tenantId);
    }
    const { startDate, endDate } = req.query;

    const poMatch = { restaurantId };
    if (startDate || endDate) {
      poMatch.purchaseDate = {};
      if (startDate) poMatch.purchaseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        poMatch.purchaseDate.$lte = end;
      }
    }

    const pos = await PurchaseOrder.find(poMatch).lean();
    const Supplier = require('../models/Supplier');
    const suppliers = await Supplier.find({ restaurantId }).lean();
    const supLookup = {};
    suppliers.forEach(s => { supLookup[s._id.toString()] = s; });

    const supplierMap = {};
    pos.forEach(po => {
      const sKey = po.supplierId ? po.supplierId.toString() : 'unknown';
      if (!supplierMap[sKey]) {
        supplierMap[sKey] = {
          supplierId: sKey,
          totalPurchaseVolume: 0,
          totalPaid: 0,
          orderCount: 0,
          topItems: [],
        };
      }
      supplierMap[sKey].totalPurchaseVolume += (Number(po.totalCost) || 0);
      supplierMap[sKey].totalPaid += (Number(po.amountPaid) || 0);
      supplierMap[sKey].orderCount += 1;
    });

    const data = Object.values(supplierMap).map(s => {
      const info = supLookup[s.supplierId] || {};
      return {
        ...s,
        supplierName: info.name || 'Supplier',
        phone: info.phone || '',
        totalOutstanding: Math.max(0, s.totalPurchaseVolume - s.totalPaid),
      };
    });

    data.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
      summary: {
        totalPurchaseVolume: data.reduce((sum, s) => sum + s.totalPurchaseVolume, 0),
        totalOutstanding: data.reduce((sum, s) => sum + s.totalOutstanding, 0),
      },
    });
  } catch (error) {
    console.error('getSupplierReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSalesReport,
  getBestSellersReport,
  getOrderTypeBreakdown,
  getPaymentBreakdown,
  getProfitLossReport,
  getFinancialOverview,
  getCategorySalesReport,
  getPeakHoursReport,
  getStaffPerformanceReport,
  getCustomerReport,
  getSupplierReport,
};
