const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/reportController');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

// checkPermission('reports') — restaurant-admin always passes; others need 'reports' in permissions[]
router.use(protect, setTenant, checkPermission('reports'));

router.get('/sales', getSalesReport);
router.get('/best-sellers', getBestSellersReport);
router.get('/order-type-breakdown', getOrderTypeBreakdown);
router.get('/payment-breakdown', getPaymentBreakdown);
router.get('/profit-loss', getProfitLossReport);
router.get('/financial-overview', getFinancialOverview);
router.get('/category-sales', getCategorySalesReport);
router.get('/peak-hours', getPeakHoursReport);
router.get('/staff-performance', getStaffPerformanceReport);
router.get('/customer-report', getCustomerReport);
router.get('/supplier-report', getSupplierReport);

module.exports = router;
