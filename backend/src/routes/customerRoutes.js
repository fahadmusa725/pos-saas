const express = require('express');
const router = express.Router();
const {
  getCustomers,
  searchCustomerByPhone,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders,
  settleCustomerCredit,
} = require('../controllers/customerController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant);

// IMPORTANT: /search must be declared BEFORE /:id to prevent Express from
// treating the string "search" as a MongoDB ObjectId parameter (which would crash).
router.get('/search', authorize('restaurant-admin', 'cashier'), searchCustomerByPhone);

router.route('/')
  .get(checkPermission('customers'), getCustomers)
  .post(authorize('restaurant-admin', 'cashier'), createCustomer);

router.get('/:id/orders', authorize('restaurant-admin', 'cashier'), getCustomerOrders);
router.post('/:id/settle-credit', authorize('restaurant-admin', 'cashier'), settleCustomerCredit);

router.route('/:id')
  .put(authorize('restaurant-admin', 'cashier'), updateCustomer)
  .delete(authorize('restaurant-admin'), deleteCustomer);

module.exports = router;
