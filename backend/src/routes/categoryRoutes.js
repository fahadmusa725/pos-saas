const express = require('express');
const router = express.Router();
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant, checkPermission('categories'));

router.route('/')
  .get(getCategories)
  .post(authorize('restaurant-admin'), createCategory);

router.route('/:id')
  .put(authorize('restaurant-admin'), updateCategory)
  .delete(authorize('restaurant-admin'), deleteCategory);

module.exports = router;