/**
 * place controller
 */

import {factories} from '@strapi/strapi'
import type {Core} from '@strapi/strapi'

type Context = any // Strapi v5 context type

export default factories.createCoreController(
  'api::place.place',
  ({strapi}: {strapi: Core.Strapi}) => ({
    /**
     * Search places with text query, geo-spatial filtering and sorting
     * GET /api/places/search
     *
     * Query params:
     * - q: search query (required)
     * - lat: latitude for geo-spatial search
     * - lng: longitude for geo-spatial search
     * - radius: search radius in km (default: 10)
     * - city: filter by city name
     * - province: filter by province codename (e.g., "ho-chi-minh")
     * - district: filter by district codename (e.g., "quan-1")
     * - ward: filter by ward codename (e.g., "phuong-ben-nghe")
     * - categories: filter by category IDs (comma-separated)
     * - minRating: minimum rating filter (0-5)
     * - sortBy: relevance|rating|distance|popular (default: relevance)
     * - limit: results per page (default: 20)
     * - offset: pagination offset (default: 0)
     *
     * Examples:
     * - Basic search: GET /api/places/search?q=cắt tóc
     * - Location filter: GET /api/places/search?q=spa&province=ho-chi-minh&district=quan-1
     * - Geo search: GET /api/places/search?q=massage&lat=10.7769&lng=106.7009&radius=5
     * - Category filter: GET /api/places/search?q=beauty&categories=1,2,3
     */
    async search(ctx: Context) {
      try {
        const {
          q,
          lat,
          lng,
          radius,
          city,
          province,
          district,
          ward,
          categories,
          minRating,
          sortBy,
          limit,
          offset,
        } = ctx.query

        // Parse categories if provided
        const categoriesArray = categories
          ? String(categories).split(',').filter(Boolean)
          : undefined

        // Call service method
        const result = await strapi.service('api::place.place').search({
          query: q ? String(q) : undefined,
          latitude: lat ? parseFloat(String(lat)) : undefined,
          longitude: lng ? parseFloat(String(lng)) : undefined,
          radiusKm: radius ? parseFloat(String(radius)) : undefined,
          city: city ? String(city) : undefined,
          province: province ? String(province) : undefined,
          district: district ? String(district) : undefined,
          ward: ward ? String(ward) : undefined,
          categories: categoriesArray,
          minRating: minRating ? parseFloat(String(minRating)) : undefined,
          sortBy: sortBy ? (String(sortBy) as any) : 'relevance',
          limit: limit ? parseInt(String(limit)) : undefined,
          offset: offset ? parseInt(String(offset)) : undefined,
        })

        ctx.body = result
      } catch (error: any) {
        strapi.log.error('Search controller error:', error)

        // Handle OpenAI quota errors specifically
        if (error.message?.includes('OpenAI API quota exceeded')) {
          return ctx.throw(
            503,
            'Search service temporarily unavailable. OpenAI API quota exceeded.',
            {
              details:
                'The AI search service has reached its usage limit. Please try again later or contact support.',
            },
          )
        }

        ctx.throw(500, 'Search failed', {details: error.message})
      }
    },

    /**
     * Search nearby places without text query
     * GET /api/places/nearby
     *
     * Query params:
     * - lat: latitude (required)
     * - lng: longitude (required)
     * - radius: search radius in km (default: 5)
     * - categories: filter by category IDs (comma-separated)
     * - minRating: minimum rating filter (0-5)
     * - limit: max results (default: 20)
     *
     * Examples:
     * - Basic nearby: GET /api/places/nearby?lat=10.7769&lng=106.7009
     * - With radius: GET /api/places/nearby?lat=10.7769&lng=106.7009&radius=2
     * - With filters: GET /api/places/nearby?lat=10.7769&lng=106.7009&categories=1,2&minRating=4
     */
    async nearby(ctx: Context) {
      try {
        const {lat, lng, radius, categories, minRating, limit} = ctx.query

        // Validate required params
        if (!lat || !lng) {
          return ctx.badRequest(
            'Latitude (lat) and longitude (lng) are required',
          )
        }

        // Parse categories if provided
        const categoriesArray = categories
          ? String(categories).split(',').filter(Boolean)
          : undefined

        const result = await strapi.service('api::place.place').searchNearby({
          latitude: parseFloat(String(lat)),
          longitude: parseFloat(String(lng)),
          radiusKm: radius ? parseFloat(String(radius)) : undefined,
          categories: categoriesArray,
          minRating: minRating ? parseFloat(String(minRating)) : undefined,
          limit: limit ? parseInt(String(limit)) : undefined,
        })

        ctx.body = result
      } catch (error: any) {
        strapi.log.error('Nearby search controller error:', error)
        ctx.throw(500, 'Nearby search failed', {details: error.message})
      }
    },

    /**
     * Get recommendations based on a place
     * GET /api/places/:id/recommendations
     *
     * Query params:
     * - limit: max recommendations (default: 10)
     *
     * Examples:
     * - Basic recommendations: GET /api/places/123/recommendations
     * - With limit: GET /api/places/123/recommendations?limit=5
     */
    async recommendations(ctx: Context) {
      try {
        const {id} = ctx.params
        const {limit} = ctx.query

        if (!id) {
          return ctx.badRequest('Place document ID is required')
        }

        const result = await strapi
          .service('api::place.place')
          .getRecommendations(
            String(id),
            limit ? parseInt(String(limit)) : undefined,
          )

        ctx.body = result
      } catch (error: any) {
        strapi.log.error('Recommendations controller error:', error)
        ctx.throw(500, 'Failed to get recommendations', {
          details: error.message,
        })
      }
    },

    /**
     * Sync a place to Qdrant (Admin only)
     * POST /api/places/:documentId/sync
     *
     * Path params:
     * - documentId: Strapi document ID of the place
     *
     * Examples:
     * - Sync specific place: POST /api/places/abc123/sync
     */
    async sync(ctx: Context) {
      try {
        const {documentId} = ctx.params

        if (!documentId) {
          return ctx.badRequest('Place document ID is required')
        }

        await strapi
          .service('api::place.place')
          .syncToQdrant(String(documentId))

        ctx.body = {
          success: true,
          message: `Place ${documentId} synced to Qdrant`,
        }
      } catch (error: any) {
        strapi.log.error('Sync controller error:', error)
        ctx.throw(500, 'Sync failed', {details: error.message})
      }
    },

    /**
     * Sync all places to Qdrant (Admin only)
     * POST /api/places/sync-all
     *
     * Query params:
     * - includeDrafts: true to include draft places (default: false)
     *
     * Examples:
     * - Sync all published places: POST /api/places/sync-all
     * - Include drafts: POST /api/places/sync-all?includeDrafts=true
     */
    async syncAll(ctx: Context) {
      try {
        const places = await strapi.documents('api::place.place').findMany({
          status: 'published',
        })

        strapi.log.info(`📍 Found ${places.length} places to sync`)
        let synced = 0
        let failed = 0

        for (const place of places) {
          try {
            await strapi
              .service('api::place.place')
              .syncToQdrant(place.documentId)
            synced++
          } catch (error) {
            strapi.log.error(`Failed to sync place ${place.documentId}:`, error)
            failed++
          }
        }

        ctx.body = {
          success: true,
          message: `Synced ${synced} places, ${failed} failed`,
          synced,
          failed,
          total: places.length,
        }
      } catch (error: any) {
        strapi.log.error('Sync all controller error:', error)
        ctx.throw(500, 'Sync all failed', {details: error.message})
      }
    },
  }),
)
