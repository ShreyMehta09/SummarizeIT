// MongoDB connection with fallback
let MongoClient: any = null
let Db: any = null

try {
  const mongodb = require('mongodb')
  MongoClient = mongodb.MongoClient
  Db = mongodb.Db
} catch (error) {
  console.warn('MongoDB not installed. Database functionality will be simulated.')
}

if (!process.env.MONGODB_URI && MongoClient) {
  console.warn('Missing MONGODB_URI environment variable')
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sumit_app'
const options = {}

let client: any
let clientPromise: Promise<any>

if (MongoClient) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<any>
    }

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options)
      globalWithMongo._mongoClientPromise = client.connect()
    }
    clientPromise = globalWithMongo._mongoClientPromise
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options)
    clientPromise = client.connect()
  }
} else {
  // Fallback when MongoDB is not available
  clientPromise = Promise.resolve({
    db: () => ({
      collection: () => ({
        findOne: async () => null,
        insertOne: async () => ({ insertedId: 'mock-id' }),
        updateOne: async () => ({ modifiedCount: 1 }),
        find: () => ({
          sort: () => ({
            limit: () => ({
              skip: () => ({
                toArray: async () => []
              })
            })
          })
        }),
        countDocuments: async () => 0
      })
    })
  })
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise

export async function getDatabase(): Promise<any> {
  const client = await clientPromise
  return client.db('sumit_app') // Your database name
}