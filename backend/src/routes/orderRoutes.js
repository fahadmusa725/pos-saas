const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateItemStatus,
  markAsPaid,
  addItemsToOrder,
} = require('../controllers/orderController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant);

router.route('/')
  .get(getOrders)
  .post(checkPermission('orders'), createOrder);

router.route('/:id').get(getOrder);

router.post('/:id/add-items', checkPermission('orders'), addItemsToOrder);
router.put('/:id/status', authorize('restaurant-admin', 'manager', 'cashier', 'waiter', 'kitchen'), updateOrderStatus);
router.put('/:orderId/items/:itemId/status', authorize('restaurant-admin', 'manager', 'waiter', 'kitchen'), updateItemStatus);
router.put('/:id/pay', authorize('restaurant-admin', 'manager', 'cashier'), markAsPaid);

module.exports = router;