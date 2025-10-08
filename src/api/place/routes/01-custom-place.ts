/**
 * Custom place routes for search functionality
 * Strapi v5 compatible routes configuration
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/places/search',
      handler: 'api::place.place.search',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/places/nearby',
      handler: 'api::place.place.nearby',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/places/:id/recommendations',
      handler: 'api::place.place.recommendations',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/places/:documentId/sync',
      handler: 'api::place.place.sync',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/places/sync-all',
      handler: 'api::place.place.syncAll',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

