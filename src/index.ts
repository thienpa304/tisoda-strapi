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
    // Initialize Qdrant collection on startup
    try {
      strapi.log.info('🚀 Initializing Qdrant collection...');
      const qdrantService = require('./api/place/services/qdrant').default;
      await qdrantService.initCollection();
      strapi.log.info('✅ Qdrant collection initialized successfully');
    } catch (error) {
      strapi.log.error('❌ Failed to initialize Qdrant:', error);
    }
  },
};
