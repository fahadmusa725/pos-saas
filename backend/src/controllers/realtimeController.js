const { createRestaurantTokenRequest } = require('../utils/realtime');

// Tokens are short lived; the browser client renews them through its authCallback.
const TOKEN_TTL_MS = 30 * 60 * 1000;

// Issues an Ably token request for the user's own restaurant channel (subscribe only).
// The tenant always comes from the authenticated user, never from the request.
exports.getRealtimeToken = async (req, res) => {
  try {
    if (req.user.role === 'super-admin' || !req.user.restaurantId) {
      return res.status(403).json({
        success: false,
        message: 'Realtime is only available for restaurant accounts',
      });
    }

    const tokenRequest = await createRestaurantTokenRequest({
      restaurantId: req.user.restaurantId,
      clientId: req.user._id.toString(),
      ttl: TOKEN_TTL_MS,
    });

    res.status(200).json({ success: true, data: tokenRequest });
  } catch (error) {
    console.error('[Realtime] Token request failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create realtime token' });
  }
};
