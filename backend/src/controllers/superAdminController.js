const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const InventoryItem = require('../models/InventoryItem');
const PurchaseOrder = require('../models/PurchaseOrder');
const Expense = require('../models/Expense');
const Coupon = require('../models/Coupon');

// Helper to generate unique slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// @desc    Get platform-wide overview statistics
// @route   GET /api/super-admin/stats
// @access  Private (super-admin)
const getPlatformStats = async (req, res) => {
  try {
    const totalRestaurants = await Restaurant.countDocuments();
    const activeCount = await Restaurant.countDocuments({ isActive: true });
    const suspendedCount = await Restaurant.countDocuments({ isActive: false });
    const trialCount = await Restaurant.countDocuments({ subscriptionStatus: 'trial' });

    res.status(200).json({
      success: true,
      data: {
        totalRestaurants,
        activeCount,
        suspendedCount,
        trialCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all restaurants with primary admin info and metrics
// @route   GET /api/super-admin/restaurants
// @access  Private (super-admin)
const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });

    const result = await Promise.all(
      restaurants.map(async (r) => {
        const doc = r.toObject();
        // Find owner restaurant-admin
        const owner = await User.findOne({
          restaurantId: r._id,
          role: 'restaurant-admin',
        }).select('name email phone createdAt');

        const orderCount = await Order.countDocuments({ restaurantId: r._id });
        const menuCount = await MenuItem.countDocuments({ restaurantId: r._id });

        return {
          ...doc,
          owner: owner || null,
          orderCount,
          menuCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new restaurant & owner admin (with duplicate email check)
// @route   POST /api/super-admin/restaurants
// @access  Private (super-admin)
const createRestaurant = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      subscriptionPlan,
      subscriptionStatus,
      trialEndsAt,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    if (!name || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide restaurant name, admin name, admin email, and admin password',
      });
    }

    const cleanEmail = adminEmail.toLowerCase().trim();

    // Duplicate email check across ALL users
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please use a unique email.',
      });
    }

    let slug = generateSlug(name);
    const existingSlug = await Restaurant.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const status = subscriptionStatus || 'trial';
    let finalTrialEndsAt = null;

    if (status === 'trial') {
      if (trialEndsAt) {
        finalTrialEndsAt = new Date(trialEndsAt);
      } else {
        // Fallback default: 14 days from now
        finalTrialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      }
    } else if (trialEndsAt) {
      finalTrialEndsAt = new Date(trialEndsAt);
    }

    // 1. Create Restaurant document
    const restaurant = await Restaurant.create({
      name,
      slug,
      email: cleanEmail,
      phone: phone || '',
      address: address || '',
      subscriptionPlan: subscriptionPlan || 'basic',
      subscriptionStatus: status,
      trialEndsAt: finalTrialEndsAt,
      isActive: status !== 'suspended',
    });

    // 2. Create primary restaurant-admin user
    const adminUser = await User.create({
      restaurantId: restaurant._id,
      name: adminName,
      email: cleanEmail,
      password: adminPassword.trim(),
      role: 'restaurant-admin',
      isActive: true,
    });

    const responseDoc = restaurant.toObject();
    responseDoc.owner = {
      id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
    };

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      data: responseDoc,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update restaurant details & admin email
// @route   PUT /api/super-admin/restaurants/:id
// @access  Private (super-admin)
const updateRestaurant = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      subscriptionPlan,
      subscriptionStatus,
      trialEndsAt,
      adminEmail,
    } = req.body;

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    if (name) restaurant.name = name;
    if (phone !== undefined) restaurant.phone = phone;
    if (address !== undefined) restaurant.address = address;
    if (subscriptionPlan) restaurant.subscriptionPlan = subscriptionPlan;

    if (subscriptionStatus) {
      restaurant.subscriptionStatus = subscriptionStatus;
      if (subscriptionStatus === 'suspended') {
        restaurant.isActive = false;
      } else {
        restaurant.isActive = true;
      }
    }

    if (subscriptionStatus === 'trial') {
      if (trialEndsAt) {
        let parsedDate = new Date(trialEndsAt);
        if (typeof trialEndsAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(trialEndsAt.trim())) {
          const [year, month, day] = trialEndsAt.trim().split('-').map(Number);
          parsedDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        }
        restaurant.trialEndsAt = parsedDate;
      } else if (!restaurant.trialEndsAt) {
        // Fallback default 14 days if turning on trial with no date specified
        restaurant.trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      }
    } else if (trialEndsAt !== undefined) {
      restaurant.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    }

    await restaurant.save();

    // Update primary restaurant-admin email if provided
    if (adminEmail && adminEmail.trim()) {
      const cleanEmail = adminEmail.trim().toLowerCase();
      const adminUser = await User.findOne({
        restaurantId: restaurant._id,
        role: 'restaurant-admin',
      });

      if (adminUser && adminUser.email !== cleanEmail) {
        // Duplicate email validation across ALL users
        const existingEmailUser = await User.findOne({ email: cleanEmail });
        if (existingEmailUser) {
          return res.status(400).json({
            success: false,
            message: 'Email address is already in use by another user account.',
          });
        }
        adminUser.email = cleanEmail;
        await adminUser.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant details updated successfully',
      data: restaurant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset primary restaurant-admin password
// @route   PATCH /api/super-admin/restaurants/:id/reset-admin-password
// @access  Private (super-admin)
const resetAdminPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const adminUser = await User.findOne({
      restaurantId: req.params.id,
      role: 'restaurant-admin',
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Primary admin account for this restaurant was not found',
      });
    }

    adminUser.password = newPassword.trim();
    await adminUser.save(); // triggers User model pre-save bcrypt hook

    res.status(200).json({
      success: true,
      message: `Password for admin '${adminUser.email}' reset successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Suspend restaurant (soft toggle -> isActive: false)
// @route   PATCH /api/super-admin/restaurants/:id/suspend
// @access  Private (super-admin)
const suspendRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    restaurant.isActive = false;
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Restaurant '${restaurant.name}' suspended successfully`,
      data: restaurant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Activate restaurant (undo suspend -> isActive: true)
// @route   PATCH /api/super-admin/restaurants/:id/activate
// @access  Private (super-admin)
const activateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    restaurant.isActive = true;
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Restaurant '${restaurant.name}' activated successfully`,
      data: restaurant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Permanently delete restaurant and ALL associated tenant data
// @route   DELETE /api/super-admin/restaurants/:id
// @access  Private (super-admin)
const deleteRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.id;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Cascading Permanent Deletion across all collections linked to restaurantId
    await Promise.all([
      User.deleteMany({ restaurantId }),
      Category.deleteMany({ restaurantId }),
      MenuItem.deleteMany({ restaurantId }),
      Order.deleteMany({ restaurantId }),
      Table.deleteMany({ restaurantId }),
      Customer.deleteMany({ restaurantId }),
      Supplier.deleteMany({ restaurantId }),
      InventoryItem.deleteMany({ restaurantId }),
      PurchaseOrder.deleteMany({ restaurantId }),
      Expense.deleteMany({ restaurantId }),
      Coupon.deleteMany({ restaurantId }),
      Restaurant.findByIdAndDelete(restaurantId),
    ]);

    res.status(200).json({
      success: true,
      message: `Restaurant '${restaurant.name}' and all associated tenant data permanently deleted`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPlatformStats,
  getAllRestaurants,
  createRestaurant,
  updateRestaurant,
  suspendRestaurant,
  activateRestaurant,
  deleteRestaurant,
  resetAdminPassword,
};
