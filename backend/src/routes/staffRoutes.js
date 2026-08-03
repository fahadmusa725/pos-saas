const express = require('express');
const router = express.Router();
const {
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  toggleStaffStatus,
  deleteStaffMember,
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

// All staff endpoints require authentication, tenant scoping, and restaurant-admin role
router.use(protect);
router.use(setTenant);
router.use(authorize('restaurant-admin'));

router.route('/')
  .get(getStaffMembers)
  .post(createStaffMember);

router.route('/:id')
  .put(updateStaffMember)
  .delete(deleteStaffMember);

router.patch('/:id/status', toggleStaffStatus);

module.exports = router;
