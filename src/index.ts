export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Initialize MeiliSearch on startup
    try {
      strapi.log.info('🚀 Initializing MeiliSearch...');
      const meiliService = require('./api/place/services/meili').default;
      await meiliService.initIndex();
      strapi.log.info('✅ MeiliSearch initialized successfully');
    } catch (error) {
      strapi.log.error('❌ Failed to initialize MeiliSearch:', error);
    }
  },
};
