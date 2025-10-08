/**
 * Qdrant Vector Database Service
 * Handles vector search and geo-spatial filtering for places
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

interface PlaceVector {
  id: number;
  name: string;
  description: string;
  categories: string[];
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  rating: number;
  quantitySold: number;
}

class QdrantService {
  private client: QdrantClient;
  private openai: OpenAI;
  private collectionName = 'places';

  constructor() {
    // Initialize Qdrant client
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });

    // Initialize OpenAI for embeddings
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Initialize collection with schema
   */
  async initCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (col) => col.name === this.collectionName
      );

      if (!exists) {
        // Create collection with vector size 1536 (OpenAI embedding size)
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        });

        // Create payload index for faster filtering
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'city',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'rating',
          field_schema: 'float',
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'categories',
          field_schema: 'keyword',
        });

        strapi.log.info('✅ Qdrant collection initialized successfully');
      }
    } catch (error) {
      strapi.log.error('❌ Failed to initialize Qdrant collection:', error);
      throw error;
    }
  }

  /**
   * Generate text embedding using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      strapi.log.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Create searchable text from place data
   */
  createSearchText(place: PlaceVector): string {
    const parts = [
      place.name,
      place.description,
      place.address,
      place.city,
      place.categories.join(' '),
    ].filter(Boolean);

    return parts.join(' ');
  }

  /**
   * Upsert place to Qdrant
   */
  async upsertPlace(place: PlaceVector) {
    try {
      const searchText = this.createSearchText(place);
      const embedding = await this.generateEmbedding(searchText);

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: place.id,
            vector: embedding,
            payload: {
              name: place.name,
              description: place.description,
              categories: place.categories,
              address: place.address,
              city: place.city,
              location: {
                lat: place.latitude,
                lon: place.longitude,
              },
              rating: place.rating,
              quantitySold: place.quantitySold,
            },
          },
        ],
      });

      strapi.log.info(`✅ Place ${place.id} indexed in Qdrant`);
    } catch (error) {
      strapi.log.error(`Failed to upsert place ${place.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete place from Qdrant
   */
  async deletePlace(placeId: number) {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [placeId],
      });

      strapi.log.info(`✅ Place ${placeId} deleted from Qdrant`);
    } catch (error) {
      strapi.log.error(`Failed to delete place ${placeId}:`, error);
      throw error;
    }
  }

  /**
   * Search places with vector similarity and geo-spatial filtering
   */
  async searchPlaces(params: {
    query: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    city?: string;
    categories?: string[];
    minRating?: number;
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
        limit = 20,
        offset = 0,
      } = params;

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Build filter conditions
      const filter: any = {
        must: [],
      };

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
        });
      }

      // City filter
      if (city) {
        filter.must.push({
          key: 'city',
          match: {
            value: city,
          },
        });
      }

      // Categories filter
      if (categories && categories.length > 0) {
        filter.must.push({
          key: 'categories',
          match: {
            any: categories,
          },
        });
      }

      // Rating filter
      if (minRating) {
        filter.must.push({
          key: 'rating',
          range: {
            gte: minRating,
          },
        });
      }

      // Perform search
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        filter: filter.must.length > 0 ? filter : undefined,
        limit,
        offset,
        with_payload: true,
      });

      return searchResult.map((result) => ({
        id: result.id,
        score: result.score,
        ...result.payload,
      }));
    } catch (error) {
      strapi.log.error('Failed to search places:', error);
      throw error;
    }
  }

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
      const {
        latitude,
        longitude,
        radiusKm = 5,
        categories,
        minRating,
        limit = 20,
      } = params;

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
      };

      if (categories && categories.length > 0) {
        filter.must.push({
          key: 'categories',
          match: {
            any: categories,
          },
        });
      }

      if (minRating) {
        filter.must.push({
          key: 'rating',
          range: {
            gte: minRating,
          },
        });
      }

      // Scroll through points with geo filter
      const result = await this.client.scroll(this.collectionName, {
        filter,
        limit,
        with_payload: true,
        with_vector: false,
      });

      return result.points.map((point) => ({
        id: point.id,
        ...point.payload,
      }));
    } catch (error) {
      strapi.log.error('Failed to search nearby places:', error);
      throw error;
    }
  }

  /**
   * Get recommendations based on a place
   */
  async getRecommendations(placeId: number, limit: number = 10) {
    try {
      // Get the vector of the reference place
      const place = await this.client.retrieve(this.collectionName, {
        ids: [placeId],
        with_vector: true,
      });

      if (!place || place.length === 0) {
        throw new Error('Place not found in Qdrant');
      }

      const vector = place[0].vector as number[];

      // Find similar places
      const recommendations = await this.client.search(this.collectionName, {
        vector,
        limit: limit + 1, // +1 to exclude the reference place itself
        with_payload: true,
      });

      // Filter out the reference place
      return recommendations
        .filter((rec) => rec.id !== placeId)
        .slice(0, limit)
        .map((result) => ({
          id: result.id,
          score: result.score,
          ...result.payload,
        }));
    } catch (error) {
      strapi.log.error('Failed to get recommendations:', error);
      throw error;
    }
  }
}

export default new QdrantService();

