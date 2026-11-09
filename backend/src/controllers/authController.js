const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc Register new restaurant + admin user
// @route POST /api/auth/register-restaurant
exports.registerRestaurant = async (req, res) => {
  try {
    if (process.env.ALLOW_PUBLIC_REGISTRATION === 'false') {
      return res.status(403).json({ success: false, message: 'Public registration is disabled' });
    }

    const { restaurantName, email, password, phone } = req.body;

    if (typeof restaurantName !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'restaurantName, email and password must be strings' });
    }

    if (!restaurantName.trim() || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const existingRestaurant = await Restaurant.findOne({ email: email.trim().toLowerCase() });
    if (existingRestaurant) {
      return res.status(400).json({ success: false, message: 'Restaurant with this email already exists' });
    }

    const slug = restaurantName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const trialDays = parseInt(process.env.TRIAL_DAYS, 10) || 14;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const restaurant = await Restaurant.create({
      name: restaurantName.trim(),
      slug,
      email: email.trim().toLowerCase(),
      phone,
      trialEndsAt,
    });

    const user = await User.create({
      restaurantId: restaurant._id,
      name: restaurantName.trim() + ' Admin',
      email: email.trim().toLowerCase(),
      password,
      role: 'restaurant-admin',
    });

    const token = generateToken(user._id, user.role, restaurant._id);

    res.status(201).json({
      success: true,
      message: 'Restaurant registered successfully',
      data: {
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug,
        },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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