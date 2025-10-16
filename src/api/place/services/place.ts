/**
 * place service
 */

import {factories} from '@strapi/strapi'
import type {Core} from '@strapi/strapi'
import qdrantService from './qdrant'

// Type definitions for better type safety
interface SearchParams {
  query: string
  latitude?: number
  longitude?: number
  radiusKm?: number
  city?: string
  province?: string
  district?: string
  ward?: string
  categories?: string[]
  minRating?: number
  sortBy?: 'relevance' | 'rating' | 'distance' | 'popular'
  limit?: number
  offset?: number
}

interface NearbySearchParams {
  latitude: number
  longitude: number
  radiusKm?: number
  categories?: string[]
  minRating?: number
  limit?: number
}

interface PlaceWithScore {
  id: number
  searchScore: number
  distance: number | null
  [key: string]: any
}

export default factories.createCoreService(
  'api::place.place',
  ({strapi}: {strapi: Core.Strapi}) => ({
    /**
     * Search places with vector similarity and geo-spatial filtering
     * Similar to GrabFood search functionality
     */
    async search(params: SearchParams) {
      try {
        const {
          query,
          latitude,
          longitude,
          radiusKm = 10,
          city,
          province,
          district,
          ward,
          categories,
          minRating,
          sortBy = 'relevance',
          limit = 20,
          offset = 0,
        } = params

        // Perform vector search with Qdrant
        // Note: We don't use offset here because we need to sort first
        const results = await qdrantService.searchPlaces({
          query,
          latitude,
          longitude,
          radiusKm,
          city,
          province,
          district,
          ward,
          categories,
          minRating,
          limit: (limit + offset) * 2, // Get enough results for sorting and pagination
          offset: 0,
        })

        strapi.log.info(`🔍 Qdrant search results: ${results.length} places found for query: "${query}"`)

        // Get full place details from Strapi
        const placeIds = results.map((r) => String(r.documentId))

        if (placeIds.length === 0) {
          strapi.log.warn(`⚠️ No places found in Qdrant for query: "${query}"`)
          return {data: [], meta: {total: 0, limit, offset, sortBy}}
        }
        
        strapi.log.info(`📍 Found place IDs: ${placeIds.join(', ')}`)

        const places = await strapi.documents('api::place.place').findMany({
          filters: {
            documentId: {
              $in: placeIds,
            },
          },
          fields: ['name', 'slug', 'quantity_sold'],
          populate: {
            avatar: {
              fields: ['url', 'alternativeText', 'width', 'height'],
            },
            category_places: {
              fields: ['name', 'slug'],
            },
            general_info: {
              fields: [], // Don't include any fields from general_info itself
              populate: {
                address: {
                  fields: ['address', 'latitude', 'longitude'],
                  populate: {
                    province: {
                      fields: ['name', 'codename'],
                    },
                    district: {
                      fields: ['name', 'codename'],
                    },
                    ward: {
                      fields: ['name', 'codename'],
                    },
                  },
                },
                rating: {
                  fields: ['score', 'review_count'],
                },
                media: {
                  fields: ['url', 'alternativeText', 'width', 'height'],
                },
              },
            },
            services: {
              fields: ['service_name', 'price', 'duration'],
              populate: {
                gallery: {
                  fields: ['url', 'alternativeText', 'width', 'height'],
                },
              },
            },
          },

          status: 'published',
        })
        console.log(places.length, 'places')
        strapi.log.debug(
          `Found ${places.length} places matching search criteria`,
        )

        // Map results with scores
        const placesWithScore: PlaceWithScore[] = places.map((place: any) => {
          const result = results.find((r) => r.document_id === place.documentId)
          return {
            ...place,
            searchScore: result?.score || 0,
            distance: this.calculateDistance(
              latitude,
              longitude,
              place.general_info?.address?.latitude,
              place.general_info?.address?.longitude,
            ),
          }
        })

        // Sort results
        let sortedPlaces = placesWithScore
        switch (sortBy) {
          case 'rating':
            sortedPlaces = placesWithScore.sort(
              (a, b) =>
                (b.general_info?.rating?.score || 0) -
                (a.general_info?.rating?.score || 0),
            )
            break
          case 'distance':
            sortedPlaces = placesWithScore.sort(
              (a, b) => (a.distance || Infinity) - (b.distance || Infinity),
            )
            break
          case 'popular':
            sortedPlaces = placesWithScore.sort(
              (a, b) => (b.quantity_sold || 0) - (a.quantity_sold || 0),
            )
            break
          case 'relevance':
          default:
            sortedPlaces = placesWithScore.sort(
              (a, b) => b.searchScore - a.searchScore,
            )
            break
        }

        // Apply pagination after sorting
        const paginatedResults = sortedPlaces.slice(offset, offset + limit)

        return {
          data: paginatedResults,
          meta: {
            total: sortedPlaces.length,
            limit,
            offset,
            sortBy,
          },
        }
      } catch (error) {
        strapi.log.error('Search error:', error)
        throw error
      }
    },

    /**
     * Search nearby places without text query
     */
    async searchNearby(params: NearbySearchParams) {
      try {
        const results = await qdrantService.searchNearby(params)

        const placeIds = results.map((r) => String(r.documentId))

        if (placeIds.length === 0) {
          return {data: [], meta: {total: 0}}
        }

        const places = await strapi.documents('api::place.place').findMany({
          filters: {
            documentId: {
              $in: placeIds,
            },
          },
          status: 'published',
          fields: ['name', 'slug', 'quantity_sold'],
          populate: {
            avatar: {
              fields: ['url', 'alternativeText', 'width', 'height'],
            },
            category_places: {
              fields: ['name', 'slug'],
            },
            general_info: {
              fields: [], // Don't include any fields from general_info itself
              populate: {
                address: {
                  fields: ['address', 'latitude', 'longitude'],
                  populate: {
                    province: {
                      fields: ['name', 'codename'],
                    },
                    district: {
                      fields: ['name', 'codename'],
                    },
                    ward: {
                      fields: ['name', 'codename'],
                    },
                  },
                },
                rating: {
                  fields: ['score', 'review_count'],
                },
                media: {
                  fields: ['url', 'alternativeText', 'width', 'height'],
                },
              },
            },
            services: {
              fields: ['service_name', 'price', 'duration'],
            },
          },
        })

        strapi.log.debug(`Found ${places.length} nearby places`)

        return {
          data: places,
          meta: {total: places.length},
        }
      } catch (error) {
        strapi.log.error('Nearby search error:', error)
        throw error
      }
    },

    /**
     * Get place recommendations based on similarity
     */
    async getRecommendations(documentId: string, limit: number = 10) {
      try {
        const results = await qdrantService.getRecommendations(documentId, limit)

        const placeIds = results.map((r: any) => String(r.documentId))

        if (placeIds.length === 0) {
          return {data: [], meta: {total: 0}}
        }

        const places = await strapi.documents('api::place.place').findMany({
          filters: {
            documentId: {
              $in: placeIds,
            },
          },
          status: 'published',
        })

        strapi.log.debug(
          `Found ${places.length} recommendations for place ${documentId}`,
        )

        return {
          data: places,
          meta: {total: places.length},
        }
      } catch (error) {
        strapi.log.error('Recommendations error:', error)
        throw error
      }
    },

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(
      lat1?: number,
      lon1?: number,
      lat2?: number,
      lon2?: number,
    ): number | null {
      if (!lat1 || !lon1 || !lat2 || !lon2) return null

      const R = 6371 // Earth's radius in km
      const dLat = this.toRad(lat2 - lat1)
      const dLon = this.toRad(lon2 - lon1)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(lat1)) *
          Math.cos(this.toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    },

    toRad(degrees: number): number {
      return degrees * (Math.PI / 180)
    },

    /**
     * Sync place to Qdrant vector database
     */
    async syncToQdrant(placeDocumentId: string) {
      try {
        const place: any = await strapi.documents('api::place.place').findOne({
          documentId: placeDocumentId,
          populate: {
            category_places: {
              fields: ['name', 'slug'],
            },
            general_info: {
              populate: {
                address: {
                  populate: {
                    province: { fields: ['name', 'codename'] },
                    district: { fields: ['name', 'codename'] },
                    ward: { fields: ['name', 'codename'] },
                  },
                },
                rating: true,
              },
            },
            services: {
              fields: ['service_name', 'service_group_name'],
            },
          },
          status: 'published',
        })

        if (!place) {
          await qdrantService.deletePlace(placeDocumentId)
          return
        }
        strapi.log.info(`place id: ${place.id}`)
        // Extract categories - use slug for better API compatibility
        const categories =
          place.category_places?.map((cat: any) => cat.slug || cat.name) || []

        // Extract service data
        const serviceNames: string[] = (place.services || [])
          .map((s: any) => s.service_name)
          .filter((name: any) => name && typeof name === 'string') as string[]
        
        const serviceGroupNames: string[] = [...new Set(
          (place.services || [])
            .map((s: any) => s.service_group_name)
            .filter((name: any) => name && typeof name === 'string')
        )] as string[]
        
        const categoryNames: string[] = (place.category_places || [])
          .map((c: any) => c.name)
          .filter((name: any) => name && typeof name === 'string') as string[]

        // Extract location data
        const province = place.general_info?.address?.province?.codename || ''
        const district = place.general_info?.address?.district?.codename || ''
        const ward = place.general_info?.address?.ward?.codename || ''

        // Prepare data for Qdrant
        const placeVector = {
          document_id: place.documentId,
          name: place.name || '',
          description: place.service_group_description
            ? JSON.stringify(place.service_group_description)
            : '',
          categories,
          address: place.general_info?.address?.address || '',
          city: place.general_info?.address?.city || '',
          province,
          district,
          ward,
          latitude: Number(place.general_info?.address?.latitude) || 0,
          longitude: Number(place.general_info?.address?.longitude) || 0,
          rating: Number(place.general_info?.rating?.score) || 0,
          quantitySold: place.quantity_sold || 0,
          serviceNames,
          serviceGroupNames,
          categoryNames,
        }

        await qdrantService.upsertPlace(placeVector)

        strapi.log.info(
          `✅ Place ${placeDocumentId} (ID: ${place.id}) synced to Qdrant`,
        )
      } catch (error) {
        strapi.log.error(
          `Failed to sync place ${placeDocumentId} to Qdrant:`,
          error,
        )
        throw error
      }
    },
  }),
)
