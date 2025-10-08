/**
 * place controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::place.place', ({ strapi }) => ({
  /**
   * Search places with text query, geo-spatial filtering and sorting
   * GET /api/places/search
   * 
   * Query params:
   * - q: search query
   * - lat: latitude
   * - lng: longitude
   * - radius: search radius in km (default: 10)
   * - city: filter by city
   * - categories: filter by category IDs (comma-separated)
   * - minRating: minimum rating filter
   * - sortBy: relevance|rating|distance|popular (default: relevance)
   * - limit: results per page (default: 20)
   * - offset: pagination offset (default: 0)
   */
  async search(ctx: any) {
    try {
      const {
        q,
        lat,
        lng,
        radius,
        city,
        categories,
        minRating,
        sortBy,
        limit,
        offset,
      } = ctx.query as any;

      // Validate required params
      if (!q) {
        return ctx.badRequest('Search query (q) is required');
      }

      // Parse categories if provided
      const categoriesArray = categories
        ? String(categories).split(',').filter(Boolean)
        : undefined;

      // Call service method
      const result = await strapi
        .service('api::place.place')
        .search({
          query: String(q),
          latitude: lat ? parseFloat(String(lat)) : undefined,
          longitude: lng ? parseFloat(String(lng)) : undefined,
          radiusKm: radius ? parseFloat(String(radius)) : undefined,
          city: city ? String(city) : undefined,
          categories: categoriesArray,
          minRating: minRating ? parseFloat(String(minRating)) : undefined,
          sortBy: sortBy ? String(sortBy) as any : 'relevance',
          limit: limit ? parseInt(String(limit)) : undefined,
          offset: offset ? parseInt(String(offset)) : undefined,
        });

      return result;
    } catch (error: any) {
      strapi.log.error('Search controller error:', error);
      return ctx.internalServerError('Search failed', { error: error.message });
    }
  },

  /**
   * Search nearby places
   * GET /api/places/nearby
   * 
   * Query params:
   * - lat: latitude (required)
   * - lng: longitude (required)
   * - radius: search radius in km (default: 5)
   * - categories: filter by category IDs (comma-separated)
   * - minRating: minimum rating filter
   * - limit: max results (default: 20)
   */
  async nearby(ctx: any) {
    try {
      const { lat, lng, radius, categories, minRating, limit } = ctx.query as any;

      // Validate required params
      if (!lat || !lng) {
        return ctx.badRequest('Latitude (lat) and longitude (lng) are required');
      }

      // Parse categories if provided
      const categoriesArray = categories
        ? String(categories).split(',').filter(Boolean)
        : undefined;

      const result = await strapi
        .service('api::place.place')
        .searchNearby({
          latitude: parseFloat(String(lat)),
          longitude: parseFloat(String(lng)),
          radiusKm: radius ? parseFloat(String(radius)) : undefined,
          categories: categoriesArray,
          minRating: minRating ? parseFloat(String(minRating)) : undefined,
          limit: limit ? parseInt(String(limit)) : undefined,
        });

      return result;
    } catch (error: any) {
      strapi.log.error('Nearby search controller error:', error);
      return ctx.internalServerError('Nearby search failed', { error: error.message });
    }
  },

  /**
   * Get recommendations based on a place
   * GET /api/places/:id/recommendations
   */
  async recommendations(ctx: any) {
    try {
      const { id } = ctx.params as any;
      const { limit } = ctx.query as any;

      if (!id) {
        return ctx.badRequest('Place ID is required');
      }

      const result = await strapi
        .service('api::place.place')
        .getRecommendations(
          parseInt(String(id)),
          limit ? parseInt(String(limit)) : undefined
        );

      return result;
    } catch (error: any) {
      strapi.log.error('Recommendations controller error:', error);
      return ctx.internalServerError('Failed to get recommendations', { error: error.message });
    }
  },

  /**
   * Sync a place to Qdrant (Admin only)
   * POST /api/places/:id/sync
   */
  async sync(ctx: any) {
    try {
      const { id } = ctx.params as any;

      if (!id) {
        return ctx.badRequest('Place ID is required');
      }

      await strapi
        .service('api::place.place')
        .syncToQdrant(parseInt(String(id)));

      return { success: true, message: `Place ${id} synced to Qdrant` };
    } catch (error: any) {
      strapi.log.error('Sync controller error:', error);
      return ctx.internalServerError('Sync failed', { error: error.message });
    }
  },

  /**
   * Sync all places to Qdrant (Admin only)
   * POST /api/places/sync-all
   * Query params:
   * - includeDrafts: true to include draft places (default: false)
   */
  async syncAll(ctx: any) {
    try {
      const { includeDrafts } = ctx.query as any;
       
      const places: any = await strapi.entityService.findMany('api::place.place', {
        filters: {
          publishedAt:{
            $notNull: true,
          }
        },
        fields: ['id'],
        limit: -1, 
      });
      
      strapi.log.info(`📍 Found ${places.length} places to sync (includeDrafts: ${!!includeDrafts})`);

      let synced = 0;
      let failed = 0;
      
      for (const place of places) {
        try {
          await strapi
            .service('api::place.place')
            .syncToQdrant(Number(place.id));
          synced++;
        } catch (error) {
          strapi.log.error(`Failed to sync place ${place.id}:`, error);
          failed++;
        }
      }

      return {
        success: true,
        message: `Synced ${synced} places, ${failed} failed`,
        synced,
        failed,
        total: places.length,
      };
    } catch (error: any) {
      strapi.log.error('Sync all controller error:', error);
      return ctx.internalServerError('Sync all failed', { error: error.message });
    }
  },
}));
