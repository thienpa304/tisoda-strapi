/**
 * place router
 * Default CRUD routes for place content type
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::place.place', {
  config: {
    find: {
      middlewares: [],
    },
    findOne: {
      middlewares: [],
    },
    create: {
      middlewares: [],
    },
    update: {
      middlewares: [],
    },
    delete: {
      middlewares: [],
    },
  },
});
