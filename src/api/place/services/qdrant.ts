/**
 * Qdrant Vector Database Service
 * Handles vector search and geo-spatial filtering for places
 */

import {QdrantClient} from '@qdrant/js-client-rest'
import {randomUUID, createHash} from 'crypto'
import embeddingService from './embedding'

interface PlaceVector {
  document_id: string
  name: string
  description: string
  categories: string[]
  address: string
  city: string
  province?: string
  district?: string
  ward?: string
  latitude: number
  longitude: number
  rating: number
  quantitySold: number
  serviceNames?: string[]
  serviceGroupNames?: string[]
  categoryNames?: string[]
}

class QdrantService {
  private client: QdrantClient
  private collectionName = (process.env.PREFIX_COLLECTION || '') + 'places'

  constructor() {
    // Initialize Qdrant client
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    })
  }

  /**
   * Initialize collection with schema
   */
  async initCollection() {
    try {
      // Initialize embedding service first
      await embeddingService.initialize()

      const providerInfo = embeddingService.getProviderInfo()
      strapi.log.info(
        `📊 Embedding: ${providerInfo.provider} (${providerInfo.model}) - ${providerInfo.dimension}D`,
      )

      // Check if collection exists
      const collections = await this.client.getCollections()
      const exists = collections.collections.some(
        (col) => col.name === this.collectionName,
      )

      if (!exists) {
        // Create collection with dynamic vector size based on embedding provider
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: providerInfo.dimension,
            distance: 'Cosine',
          },
        })

        // Create payload index for faster filtering
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'city',
          field_schema: 'keyword',
        })

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'rating',
          field_schema: 'float',
        })

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'categories',
          field_schema: 'keyword',
        })

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'province',
          field_schema: 'keyword',
        })

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'district',
          field_schema: 'keyword',
        })

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'ward',
          field_schema: 'keyword',
        })

        strapi.log.info('✅ Qdrant collection initialized successfully')
      }
    } catch (error) {
      strapi.log.error('❌ Failed to initialize Qdrant collection:', error)
      throw error
    }
  }

  /**
   * Generate text embedding using configured embedding service
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await embeddingService.generateEmbedding(text)
    } catch (error: any) {
      strapi.log.error('Failed to generate embedding:', error?.message || error)
      throw error
    }
  }

  /**
   * Convert string to UUID format using deterministic hashing
   */
  private ensureValidUUID(documentId: string): string {
    // Check if it's already a valid UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (uuidRegex.test(documentId)) {
      return documentId
    }

    // Convert string to UUID format using MD5 hash
    const hash = createHash('md5').update(documentId).digest('hex')
    const uuid = [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32),
    ].join('-')

    strapi.log.info(
      `Converted document ID "${documentId}" to UUID format: ${uuid}`,
    )
    return uuid
  }

  /**
   * Create searchable text from place data
   * Enhanced to include all relevant searchable content
   */
  createSearchText(place: PlaceVector): string {
    const parts = [
      // Place name - highest priority
      place.name,
      // Service names - critical for service-based searches
      place.serviceNames?.join(' '),
      place.serviceGroupNames?.join(' '),
      // Category information
      place.categoryNames?.join(' '),
      place.categories.join(' '),
      // Description
      place.description,
      // Location information
      place.address,
      place.city,
      place.province,
      place.district,
      place.ward,
    ].filter(Boolean)

    return parts.join(' ')
  }

  /**
   * Upsert place to Qdrant
   */
  async upsertPlace(place: PlaceVector) {
    try {
      const searchText = this.createSearchText(place)
      const embedding = await this.generateEmbedding(searchText)

      // Ensure document_id is a valid UUID
      const validUUID = this.ensureValidUUID(place.document_id)

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: validUUID,
            vector: embedding,
            payload: {
              documentId: place.document_id,
              name: place.name,
              description: place.description,
              categories: place.categories,
              address: place.address,
              city: place.city,
              province: place.province || '',
              district: place.district || '',
              ward: place.ward || '',
              location: {
                lat: place.latitude,
                lon: place.longitude,
              },
              rating: place.rating,
              quantitySold: place.quantitySold,
              serviceNames: place.serviceNames || [],
              serviceGroupNames: place.serviceGroupNames || [],
              categoryNames: place.categoryNames || [],
            },
          },
        ],
      })

      strapi.log.info(`✅ Place ${place.document_id} indexed in Qdrant`)
    } catch (error) {
      strapi.log.error(`Failed to upsert place ${place.document_id}:`, error)
      throw error
    }
  }

  /**
   * Delete place from Qdrant
   */
  async deletePlace(documentId: string) {
    try {
      // Ensure document_id is a valid UUID
      const validUUID = this.ensureValidUUID(documentId)

      await this.client.delete(this.collectionName, {
        wait: true,
        points: [validUUID],
      })

      strapi.log.info(`✅ Place ${validUUID} deleted from Qdrant`)
    } catch (error) {
      strapi.log.error(`Failed to delete place ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Search places with vector similarity and geo-spatial filtering
   * Enhanced with hybrid search: combines semantic similarity with exact match boosting
   */
  async searchPlaces(params: {
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
    limit?: number
    offset?: number
  }) {
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
        limit = 20,
        offset = 0,
      } = params

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query)

      // Build filter conditions
      const filter: any = {
        must: [],
      }

      // Geo-spatial filter
      if (latitude && longitude) {
        filter.must.push({
          key: 'location',
          geo_radius: {
            center: {
              lat: latitude,
              lon: longitude,
            },
            radius: radiusKm * 1000, // Convert km to meters
          },
        })
      }

      // City filter
      if (city) {
        filter.must.push({
          key: 'city',
          match: {
            value: city,
          },
        })
      }

      // Province filter
      if (province) {
        filter.must.push({
          key: 'province',
          match: {
            value: province,
          },
        })
      }

      // District filter
      if (district) {
        filter.must.push({
          key: 'district',
          match: {
            value: district,
          },
        })
      }

      // Ward filter
      if (ward) {
        filter.must.push({
          key: 'ward',
          match: {
            value: ward,
          },
        })
      }

      // Categories filter
      if (categories && categories.length > 0) {
        filter.must.push({
          key: 'categories',
          match: {
            any: categories,
          },
        })
      }

      // Rating filter
      if (minRating) {
        filter.must.push({
          key: 'rating',
          range: {
            gte: minRating,
          },
        })
      }

      // Perform vector search - get more results for re-ranking
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        filter: filter.must.length > 0 ? filter : undefined,
        limit: limit * 3, // Get 3x results for re-ranking
        offset,
        with_payload: true,
      })
      return searchResult.map((result) => {
        return {
          ...result.payload,
          score: result.score,
        }
      })
    } catch (error) {
      strapi.log.error('Failed to search places:', error)
      throw error
    }
  }

  /**
   * Search nearby places without text query
   */
  async searchNearby(params: {
    latitude: number
    longitude: number
    radiusKm?: number
    categories?: string[]
    minRating?: number
    limit?: number
  }) {
    try {
      const {
        latitude,
        longitude,
        radiusKm = 5,
        categories,
        minRating,
        limit = 20,
      } = params

      // Build filter
      const filter: any = {
        must: [
          {
            key: 'location',
            geo_radius: {
              center: {
                lat: latitude,
                lon: longitude,
              },
              radius: radiusKm * 1000,
            },
          },
        ],
      }

      if (categories && categories.length > 0) {
        filter.must.push({
          key: 'categories',
          match: {
            any: categories,
          },
        })
      }

      if (minRating) {
        filter.must.push({
          key: 'rating',
          range: {
            gte: minRating,
          },
        })
      }

      // Scroll through points with geo filter
      const result = await this.client.scroll(this.collectionName, {
        filter,
        limit,
        with_payload: true,
        with_vector: false,
      })

      return result.points.map((point) => ({
        ...point.payload,
      }))
    } catch (error) {
      strapi.log.error('Failed to search nearby places:', error)
      throw error
    }
  }

  /**
   * Get recommendations based on a place
   */
  async getRecommendations(documentId: string, limit: number = 10) {
    try {
      // Ensure document_id is a valid UUID
      const validUUID = this.ensureValidUUID(documentId)

      // Get the vector of the reference place
      const place = await this.client.retrieve(this.collectionName, {
        ids: [validUUID],
        with_vector: true,
      })

      if (!place || place.length === 0) {
        throw new Error('Place not found in Qdrant')
      }

      const vector = place[0].vector as number[]

      // Find similar places
      const recommendations = await this.client.search(this.collectionName, {
        vector,
        limit: limit + 1, // +1 to exclude the reference place itself
        with_payload: true,
      })

      // Filter out the reference place
      return recommendations
        .filter((rec) => rec.id !== validUUID)
        .slice(0, limit)
        .map((result) => ({
          score: result.score,
          ...result.payload,
        }))
    } catch (error) {
      strapi.log.error('Failed to get recommendations:', error)
      throw error
    }
  }
}

export default new QdrantService()
