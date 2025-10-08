/**
 * Custom place routes for search functionality
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/places/search',
      handler: 'place.search',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/places/nearby',
      handler: 'place.nearby',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/places/:id/recommendations',
      handler: 'place.recommendations',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/places/:id/sync',
      handler: 'place.sync',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/places/sync-all',
      handler: 'place.syncAll',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};

