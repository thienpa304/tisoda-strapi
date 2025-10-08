/**
 * Place lifecycle hooks
 * Automatically sync data with Qdrant when places are created, updated, or deleted
 */

export default {
  /**
   * After a place is created
   */
  async afterCreate(event: any) {
    const { result } = event;
    
    try {
      // Sync to Qdrant after creation
      if (result && result.id && result.publishedAt) {
        strapi.log.info(`🔄 Syncing new place ${result.id} to Qdrant...`);
        await strapi
          .service('api::place.place')
          .syncToQdrant(Number(result.id));
      }
    } catch (error) {
      strapi.log.error(`Failed to sync place ${result?.id} after creation:`, error);
    }
  },

  /**
   * After a place is updated
   */
  async afterUpdate(event: any) {
    const { result } = event;
    
    try {
      // Re-sync to Qdrant after update
      if (result && result.id) {
        if (result.publishedAt) {
          strapi.log.info(`🔄 Re-syncing updated place ${result.id} to Qdrant...`);
          await strapi
            .service('api::place.place')
            .syncToQdrant(Number(result.id));
        } else {
          // If unpublished, remove from Qdrant
          strapi.log.info(`🗑️ Removing unpublished place ${result.id} from Qdrant...`);
          const qdrantService = require('../../services/qdrant').default;
          await qdrantService.deletePlace(Number(result.id));
        }
      }
    } catch (error) {
      strapi.log.error(`Failed to sync place ${result?.id} after update:`, error);
    }
  },

  /**
   * After a place is deleted
   */
  async afterDelete(event: any) {
    const { result } = event;
    
    try {
      // Remove from Qdrant after deletion
      if (result && result.id) {
        strapi.log.info(`🗑️ Removing deleted place ${result.id} from Qdrant...`);
        const qdrantService = require('../../services/qdrant').default;
        await qdrantService.deletePlace(Number(result.id));
      }
    } catch (error) {
      strapi.log.error(`Failed to remove place ${result?.id} from Qdrant:`, error);
    }
  },
};

