// Har request mein restaurantId ko req object mein set karta hai
// taake controllers isse use karke query filter kar sakein
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
      if (!req.tenantId) {
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