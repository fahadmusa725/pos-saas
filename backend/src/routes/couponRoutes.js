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
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

router.use(protect, setTenant);

// Validate endpoint — any authenticated staff can validate a coupon during checkout
// (cashier needs this for order creation; no module permission needed)
router.post('/validate', authorize('restaurant-admin', 'manager', 'cashier', 'waiter'), validateCoupon);

// Coupon management — requires 'coupons' permission (restaurant-admin always passes,
// managers and others need 'coupons' in their permissions[])
router.route('/')
  .get(checkPermission('coupons'), getCoupons)
  .post(checkPermission('coupons'), createCoupon);

router.route('/:id')
  .put(checkPermission('coupons'), updateCoupon)
  .delete(checkPermission('coupons'), deleteCoupon);

router.patch('/:id/status', checkPermission('coupons'), toggleCouponStatus);

module.exports = router;
