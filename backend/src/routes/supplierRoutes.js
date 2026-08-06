const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

// checkPermission('suppliers') — restaurant-admin always passes; others need 'suppliers' in permissions[]
router.use(protect, setTenant, checkPermission('suppliers'));

router.route('/')
  .get(getSuppliers)
  .post(createSupplier);

router.route('/:id')
  .put(updateSupplier)
  .delete(deleteSupplier);

module.exports = router;
