const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// Restaurants are created by the super admin only (POST /api/super-admin/restaurants).
// @desc Login user
// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'email and password must be strings' });
    }

    if (!email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    if (user.role !== 'super-admin' && user.restaurantId) {
      const restaurant = await Restaurant.findById(user.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Associated restaurant not found' });
      }

      if (restaurant.isActive === false || restaurant.subscriptionStatus === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your restaurant account has been suspended. Please contact support.',
        });
      }

      if (restaurant.subscriptionStatus === 'cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Your restaurant subscription has been cancelled. Please contact support.',
        });
      }

      if (restaurant.subscriptionStatus === 'trial' && restaurant.trialEndsAt) {
        const trialEndDate = new Date(restaurant.trialEndsAt);
        const now = new Date();

        if (trialEndDate < now) {
          return res.status(403).json({
            success: false,
            message: 'Your trial has ended. Please contact support to upgrade your subscription.',
          });
        }
      }
    }

    const token = generateToken(user._id, user.role, user.restaurantId);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          restaurantId: user.restaurantId,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};