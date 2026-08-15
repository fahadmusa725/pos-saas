const express = require('express');
const router = express.Router();
const { registerRestaurant, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');
const Restaurant = require('../models/Restaurant');

router.post('/register-restaurant', registerRestaurant);
router.post('/login', login);

// Test protected route
router.get('/me', protect, setTenant, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        permissions: req.user.permissions || [],
        restaurantId: req.user.restaurantId,
      },
      tenantId: req.tenantId,
    },
  });
});

// Get current user's restaurant live name/info (always fresh from DB)
router.get('/me/restaurant', protect, async (req, res) => {
  try {
    if (!req.user.restaurantId) {
      return res.status(200).json({ success: true, data: null });
    }
    const restaurant = await Restaurant.findById(req.user.restaurantId).select('name slug subscriptionPlan isActive');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    res.status(200).json({ success: true, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;