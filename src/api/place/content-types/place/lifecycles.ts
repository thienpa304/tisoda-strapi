/**
 * Place content type lifecycles
 * Auto-sync to Meilisearch when places are created, updated, or deleted
 * Validate promotions before create/update
 */

import promotionValidation from '../../services/promotion-validation'

export default {
  async beforeCreate(event: any) {
    const { params } = event
    const data = params.data || event.result?.data || {}

    // Validate promotions if present
    if (data.promotions && Array.isArray(data.promotions)) {
      const placeServices = data.services || []

      const allErrors: Array<{ promotionIndex: number; errors: any[] }> = []

      data.promotions.forEach((promotion: any, index: number) => {
        const errors = promotionValidation.validatePromotion(
          promotion,
          placeServices,
        )
        if (errors.length > 0) {
          allErrors.push({
            promotionIndex: index,
            errors: errors,
          })
        }
      })

      if (allErrors.length > 0) {
        const errorMessage =
          'Promotion validation failed:\n' +
          allErrors
            .map(
              (err) =>
                `Promotion ${err.promotionIndex + 1}:\n` +
                err.errors.map((e) => `  - ${e.field}: ${e.message}`).join('\n'),
            )
            .join('\n\n')

        throw new Error(errorMessage)
      }
    }
  },

  async beforeUpdate(event: any) {
    const { params } = event
    const data = params.data || event.result?.data || {}

    // Validate promotions if present
    if (data.promotions && Array.isArray(data.promotions)) {
      // Get existing place to access services
      let placeServices: any[] = []
      try {
        const documentId =
          params.where?.documentId ||
          params.documentId ||
          event.result?.documentId
        if (documentId) {
          const existingPlace: any = await strapi.documents('api::place.place').findOne({
            documentId: String(documentId),
            populate: {
              services: true,
            },
          } as any)
          placeServices = existingPlace?.services || []
        }
      } catch (e) {
        // If can't fetch, use services from update data
        placeServices = data.services || []
      }

      // Merge with services from update data if provided
      if (data.services && Array.isArray(data.services)) {
        placeServices = [...placeServices, ...data.services]
      }

      const allErrors: Array<{ promotionIndex: number; errors: any[] }> = []

      data.promotions.forEach((promotion: any, index: number) => {
        const errors = promotionValidation.validatePromotion(
          promotion,
          placeServices,
        )
        if (errors.length > 0) {
          allErrors.push({
            promotionIndex: index,
            errors: errors,
          })
        }
      })

      if (allErrors.length > 0) {
        const errorMessage =
          'Promotion validation failed:\n' +
          allErrors
            .map(
              (err) =>
                `Promotion ${err.promotionIndex + 1}:\n` +
                err.errors.map((e) => `  - ${e.field}: ${e.message}`).join('\n'),
            )
            .join('\n\n')

        throw new Error(errorMessage)
      }
    }
  },

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