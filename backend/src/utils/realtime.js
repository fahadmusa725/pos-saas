// Ably REST publisher. Serverless functions can stop right after the response, so callers
// must await the publish. A failure is only logged: realtime delivery must never fail or
// roll back the order request.
const Ably = require('ably');

const RESTAURANT_CHANNEL_PREFIX = 'restaurant:';

const restaurantChannelName = (restaurantId) => `${RESTAURANT_CHANNEL_PREFIX}${restaurantId}`;

let restClient;
const getRestClient = () => {
  if (!restClient) {
    restClient = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  }
  return restClient;
};

// Subscribe-only token request for one restaurant channel (used by the browser clients).
// createTokenRequest() returns a promise and is signed locally with ABLY_API_KEY.
const createRestaurantTokenRequest = ({ restaurantId, clientId, ttl }) =>
  getRestClient().auth.createTokenRequest({
    clientId,
    capability: { [restaurantChannelName(restaurantId)]: ['subscribe'] },
    ttl,
  });

const publishToRestaurant = async (restaurantId, eventName, payload) => {
  try {
    await getRestClient()
      .channels.get(restaurantChannelName(restaurantId))
      .publish(eventName, payload);
  } catch (error) {
    console.error(`[Realtime] Failed to publish '${eventName}':`, error.message);
  }
};

module.exports = { publishToRestaurant, createRestaurantTokenRequest };
