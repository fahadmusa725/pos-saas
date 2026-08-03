const jwt = require('jsonwebtoken');

const generateToken = (userId, role, restaurantId) => {
  return jwt.sign(
    { id: userId, role, restaurantId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = generateToken;