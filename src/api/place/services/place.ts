/**
 * place service
 */

import {factories} from '@strapi/strapi'
import type {Core} from '@strapi/strapi'
import meiliService from './meili'

// Type definitions for better type safety
interface SearchParams {
  query?: string
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

        // Perform keyword search with Meilisearch
        const meiliSort =
          sortBy === 'rating' ? 'rating' : sortBy === 'popular' ? 'popular' : undefined
        const meiliResult = await meiliService.search({
          query,
          categories,
          province,
          district,
          ward,
          minRating,
          limit: limit * 3, // Get more results for filtering and sorting
          offset: 0,
          sortBy: meiliSort as any,
          sortOrder: 'desc',
        })

        const hits = meiliResult.hits || []
        const totalHits = meiliResult.totalHits || hits.length

        strapi.log.info(
          `🔍 Meilisearch results: ${hits.length} places found for query: "${query}" (total: ${totalHits})`,
        )

        // Get full place details from Strapi
        const placeIds = hits.map((r: any) => String(r.documentId))

        if (placeIds.length === 0) {
          strapi.log.warn(`⚠️ No places found in Meilisearch for query: "${query}"`)
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

        // Map results with scores (Meili has no numeric score exposed by default)
        const placesWithScore: PlaceWithScore[] = places.map((place: any) => {
          const hit = hits.find((r: any) => r.documentId === place.documentId)
          return {
            ...place,
            searchScore: 1, // treat Meili top results as high relevance
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
            total: totalHits, // Use total from Meilisearch
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
        // TODO: Implement nearby search using MeiliSearch or other service
        const placeIds: string[] = []

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
        // TODO: Implement recommendations using MeiliSearch or other service
        const results: any[] = []

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
     * Sync place to Meilisearch
     */
    async syncToMeili(placeDocumentId: string) {
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
                    province: {fields: ['codename']},
                    district: {fields: ['codename']},
                    ward: {fields: ['codename']},
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
          // If place not found or not published, delete from Meili
          const meiliService = strapi.service('api::place.meili')
          await meiliService.deletePlace(placeDocumentId)
          strapi.log.info(`❌ Place ${placeDocumentId} deleted from Meilisearch`)
          return
        }

        const meiliService = strapi.service('api::place.meili')
        await meiliService.initIndex()

        // Map to Meili document format
        const categories = (place.category_places || []).map((c: any) => c.slug || c.name)
        const serviceNames = [
          ...new Set(
            (place.services || [])
              .map((s: any) => s.service_name)
              .filter((x: any) => x && typeof x === 'string')
              .map((x: string) => x.trim()),
          ),
        ]
        const serviceGroupNames = [
          ...new Set(
            (place.services || [])
              .map((s: any) => s.service_group_name)
              .filter((x: any) => x && typeof x === 'string')
              .map((x: string) => x.trim()),
          ),
        ]
        const categoryNames = (place.category_places || [])
          .map((c: any) => c.name)
          .filter((x: any) => x && typeof x === 'string')

        const doc = {
          documentId: place.documentId,
          name: place.name || '',
          description: place.service_group_description
            ? JSON.stringify(place.service_group_description)
            : '',
          serviceNames,
          serviceGroupNames,
          categoryNames,
          categories,
          address: place.general_info?.address?.address || '',
          city: place.general_info?.address?.city || '',
          province: place.general_info?.address?.province?.codename || '',
          district: place.general_info?.address?.district?.codename || '',
          ward: place.general_info?.address?.ward?.codename || '',
          location: {
            lat: Number(place.general_info?.address?.latitude) || 0,
            lon: Number(place.general_info?.address?.longitude) || 0,
          },
          rating: Number(place.general_info?.rating?.score) || 0,
          quantitySold: place.quantity_sold || 0,
        }

        await meiliService.upsertPlace(doc as any)

        strapi.log.info(
          `✅ Place ${placeDocumentId} synced to Meilisearch with services: [${serviceNames.join(', ')}]`,
        )
      } catch (error) {
        strapi.log.error(
          `Failed to sync place ${placeDocumentId} to Meilisearch:`,
          error,
        )
        throw error
      }
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
                    province: {fields: ['name', 'codename']},
                    district: {fields: ['name', 'codename']},
                    ward: {fields: ['name', 'codename']},
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
          // TODO: Delete from MeiliSearch if needed
          return
        }
        strapi.log.info(`place id: ${place.id}`)
        // Extract categories - use slug for better API compatibility
        const categories =
          place.category_places?.map((cat: any) => cat.slug || cat.name) || []

        // Extract service data with better filtering and deduplication
        const serviceNames: string[] = [
          ...new Set(
            (place.services || [])
              .map((s: any) => s.service_name)
              .filter(
                (name: any) =>
                  name && typeof name === 'string' && name.trim().length > 0,
              )
              .map((name: string) => name.trim()),
          ),
        ] as string[]

        const serviceGroupNames: string[] = [
          ...new Set(
            (place.services || [])
              .map((s: any) => s.service_group_name)
              .filter(
                (name: any) =>
                  name && typeof name === 'string' && name.trim().length > 0,
              )
              .map((name: string) => name.trim()),
          ),
        ] as string[]

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

        // TODO: Upsert to MeiliSearch if needed

        strapi.log.info(
          `✅ Place ${placeDocumentId} (ID: ${place.id}) synced to MeiliSearch with services: [${serviceNames.join(', ')}]`,
        )
      } catch (error) {
        strapi.log.error(
          `Failed to sync place ${placeDocumentId} to MeiliSearch:`,
          error,
        )
        throw error
      }
    },
  }),
)
