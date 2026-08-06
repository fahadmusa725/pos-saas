const express = require('express');
const router = express.Router();
const {
  getInventoryItems,
  getLowStockItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} = require('../controllers/inventoryController');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

// checkPermission('inventory') — restaurant-admin always passes, others need 'inventory' in permissions[]
router.use(protect, setTenant, checkPermission('inventory'));

// /low-stock must be defined before /:id to prevent route conflicts
router.get('/low-stock', getLowStockItems);

router.route('/')
  .get(getInventoryItems)
  .post(createInventoryItem);

router.route('/:id')
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);

module.exports = router;
