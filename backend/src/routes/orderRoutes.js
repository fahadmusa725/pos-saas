const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateItemStatus,
  markAsPaid,
} = require('../controllers/orderController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant);

router.route('/')
  .get(getOrders)
  .post(checkPermission('orders'), createOrder);

router.route('/:id').get(getOrder);

router.put('/:id/status', authorize('restaurant-admin', 'cashier', 'waiter', 'kitchen'), updateOrderStatus);
router.put('/:orderId/items/:itemId/status', authorize('restaurant-admin', 'kitchen'), updateItemStatus);
router.put('/:id/pay', authorize('restaurant-admin', 'cashier'), markAsPaid);

module.exports = router;