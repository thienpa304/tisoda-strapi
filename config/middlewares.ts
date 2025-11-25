export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https://admin.tisoda.com',
            'https://market-assets.strapi.io',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'https://admin.tisoda.com',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: ['https://admin.tisoda.com', 'https://tisoda.com', 'https://dev.tisoda.com', 'https://www.tisoda.com', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
      headers: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
