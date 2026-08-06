const express = require('express');
const router = express.Router();
const {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
} = require('../controllers/purchaseOrderController');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

// checkPermission('purchase-orders') — restaurant-admin always passes, others need 'purchase-orders' in permissions[]
router.use(protect, setTenant, checkPermission('purchase-orders'));

router.route('/')
  .get(getPurchaseOrders)
  .post(createPurchaseOrder);

router.put('/:id/status', updatePurchaseOrderStatus);

module.exports = router;
