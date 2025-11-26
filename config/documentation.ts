/**
 * Custom API documentation definitions
 * This file contains OpenAPI specifications for custom routes
 */

export const customRoutesDocs = (generatedDocumentation: any) => {
  // Search places endpoint
  generatedDocumentation.paths['/places/search'] = {
    get: {
      tags: ['Place'],
      summary: 'Search places',
      description:
        'Search places with text query, geo-spatial filtering, location filtering (province/district/ward), and sorting. Uses Meilisearch for fast keyword-based search with Vietnamese text support.',
      parameters: [
        {
          name: 'q',
          in: 'query',
          description: 'Search query',
          required: false,
          schema: { type: 'string' },
        },
        {
          name: 'lat',
          in: 'query',
          description: 'Latitude for geo-spatial search',
          required: false,
          schema: { type: 'number' },
        },
        {
          name: 'lng',
          in: 'query',
          description: 'Longitude for geo-spatial search',
          required: false,
          schema: { type: 'number' },
        },
        {
          name: 'radius',
          in: 'query',
          description: 'Search radius in kilometers (default: 10)',
          required: false,
          schema: { type: 'number', default: 10 },
        },
        {
          name: 'city',
          in: 'query',
          description: 'Filter by city name',
          required: false,
          schema: { type: 'string' },
        },
        {
          name: 'province',
          in: 'query',
          description: 'Filter by province codename (e.g., ho-chi-minh)',
          required: false,
          schema: { type: 'string' },
        },
        {
          name: 'district',
          in: 'query',
          description: 'Filter by district codename (e.g., quan-1)',
          required: false,
          schema: { type: 'string' },
        },
        {
          name: 'ward',
          in: 'query',
          description: 'Filter by ward codename (e.g., phuong-ben-nghe)',
          required: false,
          schema: { type: 'string' },
        },
        {
          name: 'categories',
          in: 'query',
          description: 'Category IDs (comma-separated)',
          required: false,
          schema: { type: 'string' },
        },
        {
          name: 'minRating',
          in: 'query',
          description: 'Minimum rating (0-5)',
          required: false,
          schema: { type: 'number' },
        },
        {
          name: 'sortBy',
          in: 'query',
          description: 'Sort by: relevance, rating, distance, popular (default: relevance)',
          required: false,
          schema: {
            type: 'string',
            enum: ['relevance', 'rating', 'distance', 'popular'],
            default: 'relevance',
          },
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Maximum number of results (default: 20)',
          required: false,
          schema: { type: 'number', default: 20 },
        },
        {
          name: 'offset',
          in: 'query',
          description: 'Number of results to skip (default: 0)',
          required: false,
          schema: { type: 'number', default: 0 },
        },
      ],
      responses: {
        200: {
          description: 'Successful response with places data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        searchScore: { type: 'number' },
                        distance: { type: 'number' },
                        avatar: { type: 'object' },
                        category_places: { type: 'array' },
                        general_info: { type: 'object' },
                        services: { type: 'array' },
                        quantity_sold: { type: 'number' },
                      },
                    },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      limit: { type: 'number' },
                      offset: { type: 'number' },
                      sortBy: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Bad request - Missing required parameters',
        },
        500: {
          description: 'Internal server error',
        },
      },
    },
  };

  // Nearby places endpoint
  generatedDocumentation.paths['/places/nearby'] = {
    get: {
      tags: ['Place'],
      summary: 'Find nearby places',
      description: 'Find nearby places based on coordinates without text search',
      parameters: [
        {
          name: 'lat',
          in: 'query',
          description: 'Latitude (required)',
          required: true,
          schema: { type: 'number' },
        },
        {
          name: 'lng',
          in: 'query',
          description: 'Longitude (required)',
          required: true,
          schema: { type: 'number' },
        },
        {
          name: 'radius',
          in: 'query',
          description: 'Search radius in kilometers (default: 5)',
          required: false,
          schema: { type: 'number', default: 5 },
        },
        {
          name: 'categories',
          in: 'query',
          description: 'Category IDs (comma-separated)',
          required: false,
          schema: { type: 'string' },
        },
        {
          name: 'minRating',
          in: 'query',
          description: 'Minimum rating (0-5)',
          required: false,
          schema: { type: 'number' },
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Maximum number of results (default: 20)',
          required: false,
          schema: { type: 'number', default: 20 },
        },
      ],
      responses: {
        200: {
          description: 'List of nearby places',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        avatar: { type: 'object' },
                        category_places: { type: 'array' },
                        general_info: { type: 'object' },
                        services: { type: 'array' },
                        quantity_sold: { type: 'number' },
                      },
                    },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Bad request - Missing required parameters (lat, lng)',
        },
        500: {
          description: 'Internal server error',
        },
      },
    },
  };

  // Recommendations endpoint
  generatedDocumentation.paths['/places/{id}/recommendations'] = {
    get: {
      tags: ['Place'],
      summary: 'Get place recommendations',
      description: 'Get place recommendations based on a specific place using vector similarity',
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'Place ID',
          required: true,
          schema: { type: 'string' },
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Number of recommendations to return (default: 10)',
          required: false,
          schema: { type: 'number', default: 10 },
        },
      ],
      responses: {
        200: {
          description: 'List of recommended places',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        score: { type: 'number' },
                        avatar: { type: 'object' },
                        category_places: { type: 'array' },
                        general_info: { type: 'object' },
                        services: { type: 'array' },
                        quantity_sold: { type: 'number' },
                      },
                    },
                  },
                  meta: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        404: {
          description: 'Place not found',
        },
        500: {
          description: 'Internal server error',
        },
      },
    },
  };

  // Sync single place endpoint
  generatedDocumentation.paths['/places/{documentId}/sync'] = {
    post: {
      tags: ['Place'],
      summary: 'Sync place to Qdrant',
      description:
        'Sync a single place to Qdrant vector database with all service and location data (Admin only)',
      parameters: [
        {
          name: 'documentId',
          in: 'path',
          description: 'Place document ID to sync',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          description: 'Place successfully synced to Qdrant',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized - Admin authentication required',
        },
        404: {
          description: 'Place not found',
        },
        500: {
          description: 'Sync failed - Internal server error',
        },
      },
      security: [{ bearerAuth: [] }],
    },
  };

  // Sync all places endpoint
  generatedDocumentation.paths['/places/sync-all'] = {
    post: {
      tags: ['Place'],
      summary: 'Sync all places to Qdrant',
      description:
        'Sync all published places to Qdrant vector database with service and location data (Admin only)',
      parameters: [
        {
          name: 'includeDrafts',
          in: 'query',
          description: 'Include draft places (default: false)',
          required: false,
          schema: { type: 'boolean', default: false },
        },
      ],
      responses: {
        200: {
          description: 'All places successfully synced to Qdrant',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  synced: { type: 'number' },
                  failed: { type: 'number' },
                  total: { type: 'number' },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized - Admin authentication required',
        },
        500: {
          description: 'Sync failed - Internal server error',
        },
      },
      security: [{ bearerAuth: [] }],
    },
  };

  // Sync all places to Meilisearch endpoint
  generatedDocumentation.paths['/places/sync-meili'] = {
    post: {
      tags: ['Place'],
      summary: 'Sync all places to Meilisearch',
      description:
        'Sync all published places to Meilisearch for fast keyword-based search with Vietnamese text support (Admin only)',
      responses: {
        200: {
          description: 'All places successfully synced to Meilisearch',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  synced: { type: 'number' },
                  total: { type: 'number' },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized - Admin authentication required',
        },
        500: {
          description: 'Sync failed - Internal server error',
        },
      },
      security: [{ bearerAuth: [] }],
    },
  };

  return generatedDocumentation;
};
