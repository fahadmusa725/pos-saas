const express = require('express');
const router = express.Router();
const {
  createMenuItem,
  getMenuItems,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/menuItemController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant, checkPermission('menu-items'));

router.route('/')
  .get(getMenuItems)
  .post(authorize('restaurant-admin'), createMenuItem);

router.route('/:id')
  .get(getMenuItem)
  .put(authorize('restaurant-admin'), updateMenuItem)
  .delete(authorize('restaurant-admin'), deleteMenuItem);

module.exports = router;