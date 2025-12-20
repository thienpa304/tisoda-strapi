/**
 * place controller
 */

import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';

type Context = any; // Strapi v5 context type

export default factories.createCoreController(
  'api::place.place',
  ({ strapi }: { strapi: Core.Strapi }) => ({
    /**
     * Get promotions by place id
     * GET /api/places/:id/promotions
     */
    async promotions(ctx: Context) {
      const { id } = ctx.params;
      if (!id) return ctx.badRequest('Place id is required');

      const place = await (strapi as any).documents('api::place.place').findOne({
        documentId: String(id),
        status: 'published',
        populate: {
          promotions: {
            populate: {
              application: { populate: { blackout_ranges: true } },
              group_tiers: true,
            },
          },
        },
      } as any);

      if (!place) return ctx.notFound('Place not found');

      ctx.body = ((place as any).promotions || []).map((p: any) => normalizePromotionDto(p));
    },

    /**
     * Get promotions by place slug
     * GET /api/places/by-slug/:slug/promotions
     */
    async promotionsBySlug(ctx: Context) {
      const { slug } = ctx.params;
      if (!slug) return ctx.badRequest('Place slug is required');

      const place = await (strapi as any).documents('api::place.place').findFirst({
        filters: { slug: String(slug) },
        status: 'published',
        populate: {
          promotions: {
            populate: {
              application: { populate: { blackout_ranges: true } },
              group_tiers: true,
            },
          },
        },
      } as any);

      if (!place) return ctx.notFound('Place not found');

      ctx.body = ((place as any).promotions || []).map((p: any) => normalizePromotionDto(p));
    },
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
     * - province: filter by province codename (comma-separated for multiple, e.g., "ho-chi-minh" or "ho-chi-minh,ha-noi")
     * - district: filter by district codename (comma-separated for multiple, e.g., "quan-1" or "quan-1,quan-3")
     * - ward: filter by ward codename (comma-separated for multiple, e.g., "phuong-ben-nghe" or "phuong-ben-nghe,phuong-da-kao")
     * - categories: filter by category IDs (comma-separated)
     * - minRating: minimum rating filter (0-5)
     * - sortBy: relevance|rating|distance|popular (default: relevance)
     * - limit: results per page (default: 20)
     * - offset: pagination offset (default: 0)
     *
     * Examples:
     * - Basic search: GET /api/places/search?q=cắt tóc
     * - Location filter: GET /api/places/search?q=spa&province=ho-chi-minh&district=quan-1
     * - Multiple districts: GET /api/places/search?q=spa&district=quan-1,quan-3,quan-7
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
        } = ctx.query;

        // Parse categories if provided
        const categoriesArray = categories
          ? String(categories).split(',').filter(Boolean)
          : undefined;

        // Parse district, province, ward to support multiple values (comma-separated)
        const districtArray = district ? String(district).split(',').filter(Boolean) : undefined;
        const provinceArray = province ? String(province).split(',').filter(Boolean) : undefined;
        const wardArray = ward ? String(ward).split(',').filter(Boolean) : undefined;

        // Call service method
        const result = await strapi.service('api::place.place').search({
          query: q ? String(q) : undefined,
          latitude: lat ? parseFloat(String(lat)) : undefined,
          longitude: lng ? parseFloat(String(lng)) : undefined,
          radiusKm: radius ? parseFloat(String(radius)) : undefined,
          city: city ? String(city) : undefined,
          province: provinceArray,
          district: districtArray,
          ward: wardArray,
          categories: categoriesArray,
          minRating: minRating ? parseFloat(String(minRating)) : undefined,
          sortBy: sortBy ? (String(sortBy) as any) : 'relevance',
          limit: limit ? parseInt(String(limit)) : undefined,
          offset: offset ? parseInt(String(offset)) : undefined,
        });

        ctx.body = result;
      } catch (error: any) {
        strapi.log.error('Search controller error:', error);

        // Handle OpenAI quota errors specifically
        if (error.message?.includes('OpenAI API quota exceeded')) {
          return ctx.throw(
            503,
            'Search service temporarily unavailable. OpenAI API quota exceeded.',
            {
              details:
                'The AI search service has reached its usage limit. Please try again later or contact support.',
            },
          );
        }

        ctx.throw(500, 'Search failed', { details: error.message });
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
        const { lat, lng, radius, categories, minRating, limit } = ctx.query;

        // Validate required params
        if (!lat || !lng) {
          return ctx.badRequest('Latitude (lat) and longitude (lng) are required');
        }

        // Parse categories if provided
        const categoriesArray = categories
          ? String(categories).split(',').filter(Boolean)
          : undefined;

        const result = await strapi.service('api::place.place').searchNearby({
          latitude: parseFloat(String(lat)),
          longitude: parseFloat(String(lng)),
          radiusKm: radius ? parseFloat(String(radius)) : undefined,
          categories: categoriesArray,
          minRating: minRating ? parseFloat(String(minRating)) : undefined,
          limit: limit ? parseInt(String(limit)) : undefined,
        });

        ctx.body = result;
      } catch (error: any) {
        strapi.log.error('Nearby search controller error:', error);
        ctx.throw(500, 'Nearby search failed', { details: error.message });
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
        const { id } = ctx.params;
        const { limit } = ctx.query;

        if (!id) {
          return ctx.badRequest('Place document ID is required');
        }

        const result = await strapi
          .service('api::place.place')
          .getRecommendations(String(id), limit ? parseInt(String(limit)) : undefined);

        ctx.body = result;
      } catch (error: any) {
        strapi.log.error('Recommendations controller error:', error);
        ctx.throw(500, 'Failed to get recommendations', {
          details: error.message,
        });
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
        const { documentId } = ctx.params;

        if (!documentId) {
          return ctx.badRequest('Place document ID is required');
        }

        await strapi.service('api::place.place').syncToQdrant(String(documentId));

        ctx.body = {
          success: true,
          message: `Place ${documentId} synced to Qdrant`,
        };
      } catch (error: any) {
        strapi.log.error('Sync controller error:', error);
        ctx.throw(500, 'Sync failed', { details: error.message });
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
        });

        strapi.log.info(`📍 Found ${places.length} places to sync`);
        let synced = 0;
        let failed = 0;

        for (const place of places) {
          try {
            await strapi.service('api::place.place').syncToQdrant(place.documentId);
            synced++;
          } catch (error) {
            strapi.log.error(`Failed to sync place ${place.documentId}:`, error);
            failed++;
          }
        }

        ctx.body = {
          success: true,
          message: `Synced ${synced} places, ${failed} failed`,
          synced,
          failed,
          total: places.length,
        };
      } catch (error: any) {
        strapi.log.error('Sync all controller error:', error);
        ctx.throw(500, 'Sync all failed', { details: error.message });
      }
    },

    /**
     * Sync all places to Meilisearch (Admin only)
     * POST /api/places/sync-meili
     *
     * Examples:
     * - Sync all published places: POST /api/places/sync-meili
     */
    async syncMeili(ctx: Context) {
      try {
        const places = await strapi.documents('api::place.place').findMany({
          status: 'published',
          populate: {
            category_places: { fields: ['name', 'slug'] },
            general_info: {
              populate: {
                address: {
                  populate: {
                    province: { fields: ['codename', 'name'] },
                    district: { fields: ['codename', 'name'] },
                    ward: { fields: ['codename', 'name'] },
                  },
                },
                rating: true,
              },
            },
            services: { fields: ['service_name', 'service_group_name'] },
          },
        });

        const meiliService = strapi.service('api::place.meili');
        await meiliService.initIndex();

        const docs = places.map((p: any) => {
          const categories = (p.category_places || []).map((c: any) => c.slug || c.name);
          const serviceNames = [
            ...new Set(
              (p.services || [])
                .map((s: any) => s.service_name)
                .filter((x: any) => x && typeof x === 'string')
                .map((x: string) => x.trim()),
            ),
          ];
          const serviceGroupNames = [
            ...new Set(
              (p.services || [])
                .map((s: any) => s.service_group_name)
                .filter((x: any) => x && typeof x === 'string')
                .map((x: string) => x.trim()),
            ),
          ];
          const categoryNames = (p.category_places || [])
            .map((c: any) => c.name)
            .filter((x: any) => x && typeof x === 'string');

          return {
            documentId: p.documentId,
            name: p.name || '',
            description: p.service_group_description
              ? JSON.stringify(p.service_group_description)
              : '',
            serviceNames,
            serviceGroupNames,
            categoryNames,
            categories,
            address: p.general_info?.address?.address || '',
            city: p.general_info?.address?.city || '',
            cityFacet: p.general_info?.address?.city || '',
            province: p.general_info?.address?.province?.codename || '',
            provinceFacet: p.general_info?.address?.province
              ? `${p.general_info.address.province.codename || ''}|${p.general_info.address.province.name || ''}`
              : '',
            district: p.general_info?.address?.district?.codename || '',
            districtFacet: p.general_info?.address?.district
              ? `${p.general_info.address.district.codename || ''}|${p.general_info.address.district.name || ''}`
              : '',
            ward: p.general_info?.address?.ward?.codename || '',
            wardFacet: p.general_info?.address?.ward
              ? `${p.general_info.address.ward.codename || ''}|${p.general_info.address.ward.name || ''}`
              : '',
            location: {
              lat: Number(p.general_info?.address?.latitude) || 0,
              lon: Number(p.general_info?.address?.longitude) || 0,
            },
            rating: Number(p.general_info?.rating?.score) || 0,
            quantitySold: p.quantity_sold || 0,
          };
        });

        // Batch in chunks
        const chunkSize = 1000;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          await meiliService.upsertPlaces(chunk as any);
        }

        ctx.body = {
          success: true,
          message: `Synced ${docs.length} places to Meilisearch`,
          synced: docs.length,
          total: places.length,
        };
      } catch (error: any) {
        strapi.log.error('Sync Meili controller error:', error);
        ctx.throw(500, 'Sync Meili failed', { details: error.message });
      }
    },

    /**
     * Get place documents from Meilisearch
     * GET /api/places/meili/documents
     *
     * Query params:
     * - limit: number of documents to return (default: 100)
     * - offset: pagination offset (default: 0)
     */
    async getMeiliDocuments(ctx: Context) {
      try {
        const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : 100;
        const offset = ctx.query.offset ? parseInt(ctx.query.offset as string, 10) : 0;

        const meiliService = strapi.service('api::place.meili');
        const result = await meiliService.getDocuments({ limit, offset });

        ctx.body = {
          data: result.documents,
          meta: {
            total: result.total,
            limit,
            offset,
          },
        };
      } catch (error: any) {
        strapi.log.error('Get Meili documents error:', error);
        ctx.throw(500, 'Failed to get Meilisearch documents', { details: error.message });
      }
    },
  }),
);

function normalizePromotionDto(p: any) {
  // Parse days of week from boolean fields
  const daysOfWeek = [];
  if (p.application?.apply_monday) daysOfWeek.push('mon');
  if (p.application?.apply_tuesday) daysOfWeek.push('tue');
  if (p.application?.apply_wednesday) daysOfWeek.push('wed');
  if (p.application?.apply_thursday) daysOfWeek.push('thu');
  if (p.application?.apply_friday) daysOfWeek.push('fri');
  if (p.application?.apply_saturday) daysOfWeek.push('sat');
  if (p.application?.apply_sunday) daysOfWeek.push('sun');

  // Parse customer types from boolean fields
  const customer = [];
  if (p.application?.apply_new_customer) customer.push('new');
  if (p.application?.apply_existing_customer) customer.push('existing');

  // Parse comma-separated text fields
  const serviceIds = p.application?.service_ids
    ? p.application.service_ids
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .map(Number)
    : [];

  const timeSlots = p.application?.time_slots
    ? p.application.time_slots
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  const blackout = p.application?.blackout_dates
    ? p.application.blackout_dates
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  // Birthday month: boolean field - applies if customer's birthday is in the booking month
  const birthdayMonth = Boolean(p.application?.birthday_month);

  // Parse group tiers from text (format: "2:100000,3:15%")
  const groupTiers = p.group_tiers
    ? p.group_tiers
        .split(',')
        .map((tier: string) => {
          const [users, discount] = tier.split(':').map((s: string) => s.trim());
          const isPercent = discount?.includes('%');
          return {
            minUsers: parseInt(users),
            discount: {
              kind: isPercent ? 'percent' : 'fixed',
              amount: parseInt(discount?.replace('%', '')),
            },
          };
        })
        .filter((t: any) => !isNaN(t.minUsers))
    : [];

  return {
    id: p.id,
    type: p.type,
    name: p.name,
    stacking: Boolean(p.stacking),
    validity: {
      startAt: p.start_at || null,
      endAt: p.end_at || null,
    },
    discount: {
      kind: p.discount_kind,
      amount: p.amount ? Number(p.amount) : 0,
      applyScope: p.apply_scope || null,
    },
    groupTiers,
    application: {
      serviceIds,
      daysOfWeek,
      timeSlots,
      blackout,
      customer,
      bookingValue: {
        min:
          p.application?.booking_value_min != null ? Number(p.application.booking_value_min) : null,
        max:
          p.application?.booking_value_max != null ? Number(p.application.booking_value_max) : null,
      },
      birthdayMonth,
    },
    tnc: p.tnc_text || '',
    status: p.status,
  };
}
