// Har request mein restaurantId ko req object mein set karta hai
// taake controllers isse use karke query filter kar sakein
exports.setTenant = (req, res, next) => {
  if (req.user.role === 'super-admin') {
    // Super admin sab restaurants access kar sakta hai
    // Agar query mein restaurantId diya hai to use karo, warna sab dikhao
    req.tenantId = req.query.restaurantId || null;
  } else {
    // Baaki sab roles ke liye apna restaurantId force karo
    req.tenantId = req.user.restaurantId;
  }

  if (!req.tenantId && req.user.role !== 'super-admin') {
    return res.status(403).json({ success: false, message: 'No restaurant associated with this account' });
  }

  next();
};