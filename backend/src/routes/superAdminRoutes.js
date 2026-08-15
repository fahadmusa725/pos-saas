const express = require('express');
const router = express.Router();
const {
  getPlatformStats,
  getAllRestaurants,
  createRestaurant,
  updateRestaurant,
  suspendRestaurant,
  activateRestaurant,
  deleteRestaurant,
  resetAdminPassword,
} = require('../controllers/superAdminController');

const { protect, authorize } = require('../middleware/authMiddleware');

// All Super Admin routes are strictly protected by protect + authorize('super-admin')
// Notice setTenant middleware is NOT used here as Super Admin is cross-tenant
router.use(protect, authorize('super-admin'));

router.get('/stats', getPlatformStats);

router.route('/restaurants')
  .get(getAllRestaurants)
  .post(createRestaurant);

router.route('/restaurants/:id')
  .put(updateRestaurant)
  .delete(deleteRestaurant);

router.patch('/restaurants/:id/suspend', suspendRestaurant);
router.patch('/restaurants/:id/activate', activateRestaurant);
router.patch('/restaurants/:id/reset-admin-password', resetAdminPassword);

module.exports = router;
