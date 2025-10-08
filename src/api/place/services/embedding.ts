/**
 * Embedding Service
 * Supports multiple embedding providers: Local (Transformers.js) and OpenAI
 */

import { pipeline, env } from '@xenova/transformers';
import OpenAI from 'openai';

// Configure transformers to use local cache
env.localModelPath = './models/';
env.allowRemoteModels = true;

type EmbeddingProvider = 'local' | 'openai';

interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model?: string;
}

class EmbeddingService {
  private provider: EmbeddingProvider;
  private localModel: any = null;
  private openai: OpenAI | null = null;
  private modelName: string;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Get provider from environment variable (default: local)
    this.provider = (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) || 'local';
    
    // Model selection based on provider
    if (this.provider === 'local') {
      // Using multilingual model - good for Vietnamese
      this.modelName = process.env.EMBEDDING_MODEL || 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
      strapi.log.info(`🤖 Using local embeddings: ${this.modelName}`);
    } else {
      this.modelName = process.env.EMBEDDING_MODEL || 'text-embedding-ada-002';
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      strapi.log.info(`🤖 Using OpenAI embeddings: ${this.modelName}`);
    }
  }

  /**
   * Initialize the embedding model
   */
  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (this.provider === 'local' && !this.localModel) {
        try {
          strapi.log.info('📥 Loading local embedding model (first time may take a few minutes)...');
          
          // Load the feature extraction pipeline
          this.localModel = await pipeline('feature-extraction', this.modelName, {
            quantized: true, // Use quantized model for better performance
          });
          
          strapi.log.info('✅ Local embedding model loaded successfully');
        } catch (error) {
          strapi.log.error('❌ Failed to load local embedding model:', error);
          throw error;
        }
      }
    })();

    return this.initPromise;
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();

    if (this.provider === 'local') {
      return this.generateLocalEmbedding(text);
    } else {
      return this.generateOpenAIEmbedding(text);
    }
  }

  /**
   * Generate embedding using local Transformers.js
   */
  private async generateLocalEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.localModel) {
        throw new Error('Local model not initialized');
      }

      // Generate embedding
      const output = await this.localModel(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert to regular array of numbers
      const embedding = Array.from(output.data) as number[];
      
      return embedding;
    } catch (error: any) {
      strapi.log.error('Failed to generate local embedding:', error?.message || error);
      throw error;
    }
  }

  /**
   * Generate embedding using OpenAI API
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      const response = await this.openai.embeddings.create({
        model: this.modelName,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      // Check if it's a quota/rate limit error
      if (error?.status === 429) {
        strapi.log.error('⚠️  OpenAI API quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
        throw new Error('OpenAI API quota exceeded. Please upgrade your plan or wait for quota reset.');
      }
      
      strapi.log.error('Failed to generate OpenAI embedding:', error?.message || error);
      throw error;
    }
  }

  /**
   * Get the expected vector dimension for the current provider
   */
  getVectorDimension(): number {
    if (this.provider === 'local') {
      // paraphrase-multilingual-MiniLM-L12-v2 produces 384-dimensional vectors
      return 384;
    } else {
      // OpenAI text-embedding-ada-002 produces 1536-dimensional vectors
      return 1536;
    }
  }

  /**
   * Get current provider info
   */
  getProviderInfo(): { provider: EmbeddingProvider; model: string; dimension: number } {
    return {
      provider: this.provider,
      model: this.modelName,
      dimension: this.getVectorDimension(),
    };
  }
}

export default new EmbeddingService();

