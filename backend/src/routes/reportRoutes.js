const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getBestSellersReport,
  getOrderTypeBreakdown,
  getPaymentBreakdown,
  getProfitLossReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

// All report routes require restaurant-admin authorization & tenant isolation
router.use(protect, setTenant, authorize('restaurant-admin'));

router.get('/sales', getSalesReport);
router.get('/best-sellers', getBestSellersReport);
router.get('/order-type-breakdown', getOrderTypeBreakdown);
router.get('/payment-breakdown', getPaymentBreakdown);
router.get('/profit-loss', getProfitLossReport);

module.exports = router;
