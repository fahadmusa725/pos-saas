const express = require('express');
const router = express.Router();
const {
  getCoupons,
  validateCoupon,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant);

// Validate endpoint accessible to cashiers and admins
router.post('/validate', authorize('restaurant-admin', 'cashier'), validateCoupon);

// Admin-only management endpoints
router.route('/')
  .get(authorize('restaurant-admin'), getCoupons)
  .post(authorize('restaurant-admin'), createCoupon);

router.route('/:id')
  .put(authorize('restaurant-admin'), updateCoupon)
  .delete(authorize('restaurant-admin'), deleteCoupon);

router.patch('/:id/status', authorize('restaurant-admin'), toggleCouponStatus);

module.exports = router;
