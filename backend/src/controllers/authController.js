const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc Register new restaurant + admin user
// @route POST /api/auth/register-restaurant
exports.registerRestaurant = async (req, res) => {
  try {
    const { restaurantName, email, password, phone } = req.body;

    if (!restaurantName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Check if restaurant email already exists
    const existingRestaurant = await Restaurant.findOne({ email });
    if (existingRestaurant) {
      return res.status(400).json({ success: false, message: 'Restaurant with this email already exists' });
    }

    // Generate slug from restaurant name
    const slug = restaurantName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    // Create restaurant
    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug,
      email,
      phone,
    });

    // Create restaurant-admin user
    const user = await User.create({
      restaurantId: restaurant._id,
      name: restaurantName + ' Admin',
      email,
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

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
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

    // Check restaurant status (suspension & trial expiry) for non-super-admin users
    if (user.role !== 'super-admin' && user.restaurantId) {
      const Restaurant = require('../models/Restaurant');
      const restaurant = await Restaurant.findById(user.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Associated restaurant not found' });
      }

      console.log(
        `[LOGIN CHECK] Restaurant: ${restaurant.name}, subscriptionStatus: ${restaurant.subscriptionStatus}, trialEndsAt: ${restaurant.trialEndsAt}, isActive: ${restaurant.isActive}`
      );

      if (restaurant.isActive === false || restaurant.subscriptionStatus === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your restaurant account has been suspended. Please contact support.',
        });
      }

      if (restaurant.subscriptionStatus === 'trial' && restaurant.trialEndsAt) {
        const trialEndDate = new Date(restaurant.trialEndsAt);
        const now = new Date();
        console.log(
          `[TRIAL CHECK] trialEndDate: ${trialEndDate.toISOString()}, now: ${now.toISOString()}, isExpired: ${trialEndDate < now}`
        );

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