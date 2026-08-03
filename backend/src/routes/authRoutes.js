const express = require('express');
const router = express.Router();
const { registerRestaurant, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { setTenant } = require('../middleware/tenantMiddleware');

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

module.exports = router;