/**
 * Place lifecycle hooks
 * Automatically sync data with Qdrant when places are created, updated, or deleted
 */

import type { Core } from '@strapi/strapi';

interface LifecycleEvent {
  params?: any;
  result?: any;
  state?: any;
}

export default {
  /**
   * After a place is created
   */
  async afterCreate(event: LifecycleEvent) {
    const { result } = event;
    
    try {
      await (strapi.service('api::place.place') as any).syncToQdrant(
        result.documentId
      );
    } catch (error) {
      strapi.log.error(`Failed to sync place ${result?.documentId} after creation:`, error);
    }
  },

  /**
   * After a place is updated
   */
  async afterUpdate(event: LifecycleEvent) {
    const { result } = event;
    
    try {
      await (strapi.service('api::place.place') as any).syncToQdrant(
        result.documentId
      );
    } catch (error) {
      strapi.log.error(`Failed to sync place ${result?.documentId} after creation:`, error);
    }
  },

  /**
   * After a place is deleted
   */
  async afterDelete(event: LifecycleEvent) {
    const { result } = event;
    
    try {
      // Remove from Qdrant after deletion (need numeric ID for Qdrant)
      if (result && result.id) {
        strapi.log.info(`🗑️ Removing deleted place ${result.documentId} (ID: ${result.id}) from Qdrant...`);
        const qdrantService = (await import('../../services/qdrant')).default;
        await qdrantService.deletePlace(result.documentId);
      }
    } catch (error) {
      strapi.log.error(`Failed to remove place ${result?.documentId} from Qdrant:`, error);
    }
  },
};

