const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

// All supplier endpoints: admin-only (purchasing data is sensitive)
router.use(protect, setTenant, authorize('restaurant-admin'));

router.route('/')
  .get(getSuppliers)
  .post(createSupplier);

router.route('/:id')
  .put(updateSupplier)
  .delete(deleteSupplier);

module.exports = router;
