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
      description: 'Search places with text query, geo-spatial filtering and sorting',
      parameters: [
        { name: 'q', in: 'query', description: 'Search query', required: false, schema: { type: 'string' } },
        { name: 'lat', in: 'query', description: 'Latitude for geo-spatial search', required: false, schema: { type: 'number' } },
        { name: 'lng', in: 'query', description: 'Longitude for geo-spatial search', required: false, schema: { type: 'number' } },
        { name: 'radius', in: 'query', description: 'Search radius in kilometers', required: false, schema: { type: 'number' } },
        { name: 'city', in: 'query', description: 'Filter by city name', required: false, schema: { type: 'string' } },
        { name: 'categories', in: 'query', description: 'Category IDs (comma-separated)', required: false, schema: { type: 'string' } },
        { name: 'minRating', in: 'query', description: 'Minimum rating (0-5)', required: false, schema: { type: 'number' } },
        { name: 'sortBy', in: 'query', description: 'Sort by: relevance, rating, distance, popular', required: false, schema: { type: 'string', enum: ['relevance', 'rating', 'distance', 'popular'] } },
        { name: 'limit', in: 'query', description: 'Maximum number of results', required: false, schema: { type: 'number' } },
        { name: 'offset', in: 'query', description: 'Number of results to skip', required: false, schema: { type: 'number' } },
      ],
      responses: {
        200: {
          description: 'Successful response with places data',
        },
      },
    },
  };

  // Nearby places endpoint
  generatedDocumentation.paths['/places/nearby'] = {
    get: {
      tags: ['Place'],
      summary: 'Find nearby places',
      description: 'Find nearby places based on coordinates',
      parameters: [
        { name: 'lat', in: 'query', description: 'Latitude', required: true, schema: { type: 'number' } },
        { name: 'lng', in: 'query', description: 'Longitude', required: true, schema: { type: 'number' } },
        { name: 'radius', in: 'query', description: 'Search radius in kilometers (default: 5)', required: false, schema: { type: 'number', default: 5 } },
        { name: 'limit', in: 'query', description: 'Maximum number of results', required: false, schema: { type: 'number' } },
      ],
      responses: {
        200: {
          description: 'List of nearby places',
        },
        400: {
          description: 'Bad request - Missing required parameters (lat, lng)',
        },
      },
    },
  };

  // Recommendations endpoint
  generatedDocumentation.paths['/places/{id}/recommendations'] = {
    get: {
      tags: ['Place'],
      summary: 'Get place recommendations',
      description: 'Get place recommendations based on a specific place',
      parameters: [
        { name: 'id', in: 'path', description: 'Place ID', required: true, schema: { type: 'string' } },
        { name: 'limit', in: 'query', description: 'Number of recommendations to return', required: false, schema: { type: 'number', default: 10 } },
      ],
      responses: {
        200: {
          description: 'List of recommended places',
        },
        404: {
          description: 'Place not found',
        },
      },
    },
  };

  // Sync single place endpoint
  generatedDocumentation.paths['/places/{id}/sync'] = {
    post: {
      tags: ['Place'],
      summary: 'Sync place to Qdrant',
      description: 'Sync a single place to Qdrant vector database (Admin only)',
      parameters: [
        { name: 'id', in: 'path', description: 'Place ID to sync', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Place successfully synced to Qdrant',
        },
        401: {
          description: 'Unauthorized - Admin authentication required',
        },
        404: {
          description: 'Place not found',
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
      description: 'Sync all published places to Qdrant vector database (Admin only)',
      responses: {
        200: {
          description: 'All places successfully synced to Qdrant',
        },
        401: {
          description: 'Unauthorized - Admin authentication required',
        },
      },
      security: [{ bearerAuth: [] }],
    },
  };

  return generatedDocumentation;
};

