export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // Register custom field for service selection on server side (app-specific, not plugin)
    strapi.customFields.register({
      name: 'service-select',
      type: 'text',
    });

    // Register custom field for days multi-select
    strapi.customFields.register({
      name: 'days-multi-select',
      type: 'json',
    });

    // Register custom field for time slots multi-select
    strapi.customFields.register({
      name: 'time-slot-multi-select',
      type: 'json',
    });

    // Register custom field for blackout dates multi-select
    strapi.customFields.register({
      name: 'blackout-dates-multi-select',
      type: 'json',
    });

    // Register generic multi-select custom field
    strapi.customFields.register({
      name: 'multi-select',
      type: 'json',
    });
  },

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
