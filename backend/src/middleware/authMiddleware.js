const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Token verify karta hai aur user ko request mein attach karta hai
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Header se token nikalo: "Authorization: Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }

    // Token verify karo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // User ko database se lao (password chhod kar)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    // Request object mein user attach karo taake aage routes use kar sakein
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

// Role-based access control — specific roles hi allow karega
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Granular module permission check middleware
// 1. Checks tenant subscription plan (PLAN_MODULES) for all non-super-admin users
// 2. Checks role (restaurant-admin always gets plan-allowed modules) or user permissions[] array
exports.checkPermission = (moduleName) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'super-admin') {
        return next();
      }

      // Check tenant subscription plan restrictions
      if (req.user.restaurantId) {
        const Restaurant = require('../models/Restaurant');
        const { PLAN_MODULES } = require('../config/modules');
        const restaurant = await Restaurant.findById(req.user.restaurantId).select('subscriptionPlan');
        if (restaurant) {
          const plan = restaurant.subscriptionPlan || 'basic';
          const allowedModules = PLAN_MODULES[plan] || PLAN_MODULES['basic'];
          if (!allowedModules.includes(moduleName)) {
            return res.status(403).json({
              success: false,
              message: `The '${moduleName}' module is not included in your restaurant's subscription plan (${plan})`,
            });
          }
        }
      }

      if (req.user.role === 'restaurant-admin') {
        return next();
      }

      const userPermissions = req.user.permissions || [];
      if (!userPermissions.includes(moduleName)) {
        return res.status(403).json({
          success: false,
          message: `You do not have permission to access the '${moduleName}' module`,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};