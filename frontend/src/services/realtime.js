import Ably from 'ably';
import api from './api';

// One Ably Realtime connection per tab. Pages subscribe/unsubscribe on this shared client
// and authStore closes it on logout. Kept in its own module so the Vite HMR reload does not
// create duplicate connections.
let client = null;

const getClient = () => {
  if (!client) {
    client = new Ably.Realtime({
      // ably 2.x authCallback signature is (tokenParams, callback). The token request is
      // fetched from our API, so the JWT is attached by the api service interceptor.
      authCallback: (tokenParams, callback) => {
        api.get('/realtime/token')
          .then((res) => callback(null, res.data.data))
          .catch((error) => callback(error, null));
      },
    });
  }
  return client;
};

export const getRestaurantChannel = (restaurantId) => getClient().channels.get(`restaurant:${restaurantId}`);

export const closeRealtime = () => {
  if (client) {
    client.close();
    client = null;
  }
};
