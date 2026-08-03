const express = require('express');
const router = express.Router();
const {
  getInventoryItems,
  getLowStockItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant, authorize('restaurant-admin'));

// /low-stock must be defined before /:id to prevent route conflicts
router.get('/low-stock', getLowStockItems);

router.route('/')
  .get(getInventoryItems)
  .post(createInventoryItem);

router.route('/:id')
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);

module.exports = router;
