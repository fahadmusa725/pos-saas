const express = require('express');
const router = express.Router();
const {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
} = require('../controllers/purchaseOrderController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant, authorize('restaurant-admin'));

router.route('/')
  .get(getPurchaseOrders)
  .post(createPurchaseOrder);

router.put('/:id/status', updatePurchaseOrderStatus);

module.exports = router;
