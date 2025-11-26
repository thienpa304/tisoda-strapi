// 'use strict';

// const strapi = require('@strapi/strapi');
// const {resolve} = require("path");

// strapi.createStrapi({ distDir: resolve(__dirname, './dist') }).start();

'use strict';

try {
  const strapi = require('@strapi/strapi');
  const { resolve } = require('path');

  strapi
    .createStrapi({
      distDir: resolve(__dirname, './dist'),
    })
    .start()
    .then(() => {
      console.log('Strapi started successfully');
    })
    .catch((error) => {
      console.error('Failed to start Strapi:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('Initialization error:', error);
  process.exit(1);
}
