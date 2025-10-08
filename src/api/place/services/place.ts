/**
 * place service
 */

import { factories } from '@strapi/strapi';
import qdrantService from './qdrant';

export default factories.createCoreService('api::place.place', ({ strapi }) => ({
  /**
   * Search places with vector similarity and geo-spatial filtering
   * Similar to GrabFood search functionality
   */
  async search(params: {
    query: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    city?: string;
    categories?: string[];
    minRating?: number;
    sortBy?: 'relevance' | 'rating' | 'distance' | 'popular';
    limit?: number;
    offset?: number;
  }) {
    try {
      const {
        query,
        latitude,
        longitude,
        radiusKm = 10,
        city,
        categories,
        minRating,
        sortBy = 'relevance',
        limit = 20,
        offset = 0,
      } = params;

      // Perform vector search with Qdrant
      const results = await qdrantService.searchPlaces({
        query,
        latitude,
        longitude,
        radiusKm,
        city,
        categories,
        minRating,
        limit: limit * 2, // Get more results for sorting
        offset,
      });

      // Get full place details from Strapi
      const placeIds = results.map((r) => Number(r.id));
      
      if (placeIds.length === 0) {
        return { data: [], meta: { total: 0 } };
      }

      const places = await strapi.entityService.findMany('api::place.place', {
        filters: {
          id: {
            $in: placeIds,
          },
          publishedAt: {
            $notNull: true,
          },
        },
        populate: {
          avatar: true,
          category_places: true,
          general_info: {
            populate: {
              media: true,
              address: true,
              rating: true,
              opening_time: true,
            },
          },
          services: true,
          discount: true,
        },
        limit: -1, // Fetch all matching places (no default limit)
      });

      // Map results with scores
      const placesWithScore = places.map((place: any) => {
        const result = results.find((r) => Number(r.id) === place.id);
        return {
          ...place,
          searchScore: result?.score || 0,
          distance: this.calculateDistance(
            latitude,
            longitude,
            place.general_info?.address?.latitude,
            place.general_info?.address?.longitude
          ),
        };
      });

      // Sort results
      let sortedPlaces = placesWithScore;
      switch (sortBy) {
        case 'rating':
          sortedPlaces = placesWithScore.sort(
            (a, b) =>
              (b.general_info?.rating?.value || 0) -
              (a.general_info?.rating?.value || 0)
          );
          break;
        case 'distance':
          sortedPlaces = placesWithScore.sort(
            (a, b) => (a.distance || Infinity) - (b.distance || Infinity)
          );
          break;
        case 'popular':
          sortedPlaces = placesWithScore.sort(
            (a, b) => (b.quantity_sold || 0) - (a.quantity_sold || 0)
          );
          break;
        case 'relevance':
        default:
          sortedPlaces = placesWithScore.sort(
            (a, b) => b.searchScore - a.searchScore
          );
          break;
      }

      // Limit results
      const paginatedResults = sortedPlaces.slice(0, limit);

      return {
        data: paginatedResults,
        meta: {
          total: results.length,
          limit,
          offset,
          sortBy,
        },
      };
    } catch (error) {
      strapi.log.error('Search error:', error);
      throw error;
    }
  },

  /**
   * Search nearby places without text query
   */
  async searchNearby(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    categories?: string[];
    minRating?: number;
    limit?: number;
  }) {
    try {
      const results = await qdrantService.searchNearby(params);
      
      const placeIds = results.map((r) => Number(r.id));
      
      if (placeIds.length === 0) {
        return { data: [], meta: { total: 0 } };
      }

      const places = await strapi.entityService.findMany('api::place.place', {
        filters: {
          id: {
            $in: placeIds,
          },
          publishedAt: {
            $notNull: true,
          },
        },
        populate: {
          avatar: true,
          category_places: true,
          general_info: {
            populate: {
              media: true,
              address: true,
              rating: true,
              opening_time: true,
            },
          },
          services: true,
          discount: true,
        },
        limit: -1, // Fetch all matching places (no default limit)
      });

      return {
        data: places,
        meta: { total: places.length },
      };
    } catch (error) {
      strapi.log.error('Nearby search error:', error);
      throw error;
    }
  },

  /**
   * Get place recommendations
   */
  async getRecommendations(placeId: number, limit: number = 10) {
    try {
      const results = await qdrantService.getRecommendations(placeId, limit);
      
      const placeIds = results.map((r) => Number(r.id));
      
      if (placeIds.length === 0) {
        return { data: [] };
      }

      const places = await strapi.entityService.findMany('api::place.place', {
        filters: {
          id: {
            $in: placeIds,
          },
          publishedAt: {
            $notNull: true,
          },
        },
        populate: {
          avatar: true,
          category_places: true,
          general_info: {
            populate: {
              media: true,
              address: true,
              rating: true,
            },
          },
          discount: true,
        },
        limit: -1, // Fetch all matching places (no default limit)
      });

      return { data: places };
    } catch (error) {
      strapi.log.error('Recommendations error:', error);
      throw error;
    }
  },

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    lat1?: number,
    lon1?: number,
    lat2?: number,
    lon2?: number
  ): number | null {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Sync place to Qdrant
   */
  async syncToQdrant(placeId: number) {
    try {
      const place: any = await strapi.entityService.findOne(
        'api::place.place',
        placeId,
        {
          populate: {
            category_places: true,
            general_info: {
              populate: {
                address: true,
                rating: true,
              },
            },
          },
        }
      );

      if (!place) {
        throw new Error(`Place ${placeId} not found`);
      }

      // Extract categories
      const categories = place.category_places?.map((cat: any) => cat.name) || [];

      // Prepare data for Qdrant
      const placeVector = {
        id: Number(place.id),
        name: place.name || '',
        description: place.service_group_description
          ? JSON.stringify(place.service_group_description)
          : '',
        categories,
        address: place.general_info?.address?.address || '',
        city: place.general_info?.address?.city || '',
        latitude: Number(place.general_info?.address?.latitude) || 0,
        longitude: Number(place.general_info?.address?.longitude) || 0,
        rating: Number(place.general_info?.rating?.value) || 0,
        quantitySold: place.quantity_sold || 0,
      };

      await qdrantService.upsertPlace(placeVector);
      
      strapi.log.info(`✅ Place ${placeId} synced to Qdrant`);
    } catch (error) {
      strapi.log.error(`Failed to sync place ${placeId} to Qdrant:`, error);
      throw error;
    }
  },
}));
