/**
 * Place content type lifecycles
 * Auto-sync to Meilisearch when places are created, updated, or deleted
 */

export default {
  async afterCreate(event: any) {
    const { result } = event
    try {
      // Sync to Meilisearch
      await strapi.service('api::place.place').syncToMeili(result.documentId)
      strapi.log.info(`✅ Place ${result.documentId} synced to Meilisearch after create`)
    } catch (error) {
      strapi.log.error(`Failed to sync place ${result.documentId} to Meilisearch:`, error)
    }
  },

  async afterUpdate(event: any) {
    const { result } = event
    try {
      // Sync to Meilisearch
      await strapi.service('api::place.place').syncToMeili(result.documentId)
      strapi.log.info(`✅ Place ${result.documentId} synced to Meilisearch after update`)
    } catch (error) {
      strapi.log.error(`Failed to sync place ${result.documentId} to Meilisearch:`, error)
    }
  },

  async afterDelete(event: any) {
    const { result } = event
    try {
      // Delete from Meilisearch
      const meiliService = strapi.service('api::place.meili')
      await meiliService.deletePlace(result.documentId)
      strapi.log.info(`✅ Place ${result.documentId} deleted from Meilisearch`)
    } catch (error) {
      strapi.log.error(`Failed to delete place ${result.documentId} from Meilisearch:`, error)
    }
  },
}