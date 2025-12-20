import { MeiliSearch } from 'meilisearch';

interface MeiliPlaceDoc {
  documentId: string;
  name: string;
  description?: string;
  serviceNames?: string[];
  serviceGroupNames?: string[];
  categoryNames?: string[];
  categories?: string[];
  address?: string;
  city?: string;
  cityFacet?: string;
  province?: string;
  provinceFacet?: string;
  district?: string;
  districtFacet?: string;
  ward?: string;
  wardFacet?: string;
  location?: { lat: number; lon: number };
  rating?: number;
  quantitySold?: number;
}

const MEILI_HOST = process.env.MEILI_HOST || 'http://127.0.0.1:7700';
const MEILI_API_KEY = process.env.MEILI_API_KEY || '';
const MEILI_INDEX = (process.env.PREFIX_COLLECTION || '') + 'places';

class MeiliService {
  private client: MeiliSearch;
  private initialized = false;

  constructor() {
    this.client = new MeiliSearch({ host: MEILI_HOST, apiKey: MEILI_API_KEY });
  }

  async initIndex() {
    const index = this.client.index(MEILI_INDEX);
    // Ensure primary key
    try {
      await index.getRawInfo();
    } catch (e) {
      await this.client.createIndex(MEILI_INDEX, { primaryKey: 'documentId' });
    }

    // Settings - Optimized for exact service matching
    await index.updateSettings({
      searchableAttributes: [
        'serviceNames', // Highest priority for service names
        'name', // Place names
        'serviceGroupNames',
        'categoryNames',
        'categories',
        'description',
        'address',
        'city',
        'province',
        'district',
        'ward',
      ],
      filterableAttributes: [
        'categories',
        'province',
        'district',
        'ward',
        'cityFacet',
        'provinceFacet',
        'districtFacet',
        'wardFacet',
        'rating',
      ],
      sortableAttributes: ['rating', 'quantitySold'],
      rankingRules: [
        'exactness', // Exact matches get highest priority
        'words', // Word matches
        'attribute', // Attribute ranking
        'proximity', // Proximity of words
        'typo', // Handle typos (lower priority)
        'sort', // Custom sorting
      ],
      // Add typo tolerance settings for better exact matching
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4,
          twoTypos: 8,
        },
        disableOnWords: [], // Don't disable on any words
        disableOnAttributes: [], // Don't disable on any attributes
      },
      // Improve exact matching by requiring all terms
      // This is handled by the ranking rules and typo tolerance settings
    });
    this.initialized = true;
  }

  private async ensureInit() {
    if (!this.initialized) {
      try {
        await this.initIndex();
      } catch (e) {
        // best effort: ignore if already initialized elsewhere
        this.initialized = true;
      }
    }
  }

  async upsertPlaces(docs: MeiliPlaceDoc[]) {
    if (!docs || docs.length === 0) return;
    await this.ensureInit();
    const index = this.client.index(MEILI_INDEX);
    await index.addDocuments(docs);
  }

  async upsertPlace(doc: MeiliPlaceDoc) {
    return this.upsertPlaces([doc]);
  }

  async deletePlace(documentId: string) {
    await this.ensureInit();
    const index = this.client.index(MEILI_INDEX);
    await index.deleteDocument(documentId);
  }

  async search(params: {
    query?: string;
    limit?: number;
    offset?: number;
    categories?: string[];
    province?: string;
    district?: string;
    ward?: string;
    minRating?: number;
    sortBy?: 'rating' | 'popular';
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      query = '',
      limit = 20,
      offset = 0,
      categories,
      province,
      district,
      ward,
      minRating,
      sortBy,
      sortOrder = 'desc',
    } = params;

    const filters: string[] = [];
    if (categories && categories.length > 0) {
      const inList = categories.map((c) => `"${c}"`).join(', ');
      filters.push(`categories IN [${inList}]`);
    }
    if (province) filters.push(`province = "${province}"`);
    if (district) filters.push(`district = "${district}"`);
    if (ward) filters.push(`ward = "${ward}"`);
    if (typeof minRating === 'number') filters.push(`rating >= ${minRating}`);

    const sortParam =
      sortBy === 'rating'
        ? [`rating:${sortOrder}`]
        : sortBy === 'popular'
          ? [`quantitySold:${sortOrder}`]
          : undefined;

    await this.ensureInit();
    const index = this.client.index(MEILI_INDEX);

    // Search with filters to get actual results
    const res = await index.search<any>(query, {
      limit,
      offset,
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      sort: sortParam,
    });

    // Get facets from search without filters
    // If there's a query, facets are based on query results
    // If no query, facets are from all documents
    const facetRes = await index.search<any>(query || '', {
      limit: 0, // We only need facets, not hits
      facets: ['cityFacet', 'provinceFacet', 'districtFacet', 'wardFacet'],
      // No filters - facets based on query only (or all if no query)
    });
    const facetDistribution = facetRes.facetDistribution || {};

    return {
      hits: res.hits as any[],
      totalHits: res.estimatedTotalHits || res.hits.length,
      facetDistribution,
    };
  }

  /**
   * Get all documents from Meilisearch
   */
  async getDocuments(params?: { limit?: number; offset?: number }) {
    const { limit = 100, offset = 0 } = params || {};
    await this.ensureInit();
    const index = this.client.index(MEILI_INDEX);

    // Search with empty query to get all documents
    const res = await index.search<any>('', {
      limit,
      offset,
    });

    return {
      documents: res.hits as MeiliPlaceDoc[],
      total: res.estimatedTotalHits || res.hits.length,
    };
  }
}

export default new MeiliService();
