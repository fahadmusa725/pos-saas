const express = require('express');
const router = express.Router();
const { createTable, getTables, updateTable, deleteTable } = require('../controllers/tableController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant, checkPermission('tables'));

router.route('/')
  .get(getTables)
  .post(authorize('restaurant-admin'), createTable);

router.route('/:id')
  .put(authorize('restaurant-admin', 'cashier', 'waiter'), updateTable)
  .delete(authorize('restaurant-admin'), deleteTable);

module.exports = router;