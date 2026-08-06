const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getBestSellersReport,
  getOrderTypeBreakdown,
  getPaymentBreakdown,
  getProfitLossReport,
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

module.exports = router;
