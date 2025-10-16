/**
 * Script to reset Qdrant collection
 * Run this when changing embedding providers to recreate collection with correct dimensions
 */

import {QdrantClient} from '@qdrant/js-client-rest'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({path: path.resolve(__dirname, '../.env')})

async function resetQdrantCollection() {
  const client = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  })

  const collectionName = process.env.PREFIX_COLLECTION || '' + 'places'

  try {
    console.log(`🗑️  Deleting collection: ${collectionName}...`)

    // Check if collection exists
    const collections = await client.getCollections()
    const exists = collections.collections.some(
      (col) => col.name === collectionName,
    )

    if (exists) {
      await client.deleteCollection(collectionName)
      console.log('✅ Collection deleted successfully')
    } else {
      console.log('ℹ️  Collection does not exist, nothing to delete')
    }

    console.log(
      '✅ Done! Restart Strapi to recreate collection with new dimensions.',
    )
  } catch (error) {
    console.error('❌ Error resetting collection:', error)
    process.exit(1)
  }
}

resetQdrantCollection()
