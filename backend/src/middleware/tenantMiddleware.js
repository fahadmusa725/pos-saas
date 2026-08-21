exports.setTenant = async (req, res, next) => {
  try {
    if (req.user.role === 'super-admin') {
      req.tenantId = req.query.restaurantId || null;
      if (!req.tenantId) {
        const Restaurant = require('../models/Restaurant');
        const firstRest = await Restaurant.findOne();
        if (firstRest) req.tenantId = firstRest._id;
      }
    } else {
      req.tenantId = req.user.restaurantId;
      if (req.tenantId) {
        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findById(req.tenantId);
        if (restaurant) {
          if (restaurant.isActive === false || restaurant.subscriptionStatus === 'suspended') {
            return res.status(403).json({
              success: false,
              message: 'Your restaurant account has been suspended. Please contact support.',
            });
          }
          if (restaurant.subscriptionStatus === 'trial' && restaurant.trialEndsAt) {
            const trialEndDate = new Date(restaurant.trialEndsAt);
            if (trialEndDate < new Date()) {
              return res.status(403).json({
                success: false,
                message: 'Your trial has ended. Please contact support to upgrade your subscription.',
              });
            }
          }
        }
      } else {
        const Restaurant = require('../models/Restaurant');
        const firstRest = await Restaurant.findOne();
        if (firstRest) req.tenantId = firstRest._id;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};