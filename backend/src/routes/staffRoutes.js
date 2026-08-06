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

router.use(protect, setTenant);

// GET /staff — restaurant-admin and manager can view staff list
router.get('/', authorize('restaurant-admin', 'manager'), getStaffMembers);

// POST /staff — only restaurant-admin can create new staff
router.post('/', authorize('restaurant-admin'), createStaffMember);

// PUT /staff/:id — restaurant-admin and manager can edit staff members
router.put('/:id', authorize('restaurant-admin', 'manager'), updateStaffMember);

// DELETE /staff/:id — only restaurant-admin can remove staff
router.delete('/:id', authorize('restaurant-admin'), deleteStaffMember);

// PATCH /staff/:id/status — restaurant-admin and manager can toggle active/inactive
router.patch('/:id/status', authorize('restaurant-admin', 'manager'), toggleStaffStatus);

module.exports = router;
