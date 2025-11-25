// Lab 4 - Connect to Redis and MongoDB Atlas
// Database: AgriDB, Collection: readings

const redis = require('redis');
const { MongoClient } = require('mongodb');

// ============================================
// CONFIGURATION
// ============================================

// MongoDB Atlas Connection String
// TODO: Replace with your actual connection string
const MONGODB_URI = 'mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/AgriDB?retryWrites=true&w=majority';

// Redis Configuration
const REDIS_CONFIG = {
  host: 'localhost',
  port: 6379
};

// MongoDB Configuration
const DB_NAME = 'AgriDB';
const COLLECTION_NAME = 'readings';

// ============================================
// MAIN FUNCTION
// ============================================

async function connectDatabases() {
  console.log('\n' + '='.repeat(60));
  console.log('Lab 4: Connecting to Redis and MongoDB Atlas');
  console.log('='.repeat(60) + '\n');

  // ==========================================
  // CONNECT TO REDIS
  // ==========================================
  
  console.log('1️⃣  Connecting to Redis...');
  
  const redisClient = redis.createClient({
    socket: {
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port
    }
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis Error:', err);
  });

  await redisClient.connect();
  console.log('✅ Redis connected successfully!\n');

  // Test Redis with PING
  const pingResponse = await redisClient.ping();
  console.log(`   Redis PING: ${pingResponse}`);
  
  // Test Redis with SET and GET
  await redisClient.set('lab4_test', 'Redis is working!');
  const testValue = await redisClient.get('lab4_test');
  console.log(`   Redis TEST: ${testValue}\n`);

  // ==========================================
  // CONNECT TO MONGODB ATLAS
  // ==========================================
  
  console.log('2️⃣  Connecting to MongoDB Atlas...');
  
  const mongoClient = new MongoClient(MONGODB_URI);

  try {
    await mongoClient.connect();
    console.log('✅ MongoDB connected successfully!\n');

    // Access the database and collection
    const database = mongoClient.db(DB_NAME);
    const collection = database.collection(COLLECTION_NAME);

    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Collection: ${COLLECTION_NAME}`);

    // Count existing documents
    const documentCount = await collection.countDocuments();
    console.log(`   Existing documents: ${documentCount}`);

    // Insert a test reading
    const testReading = {
      sensor_id: 'sensor_001',
      temperature: 25.5,
      humidity: 60,
      timestamp: new Date(),
      location: 'Field A',
      test: true
    };

    const insertResult = await collection.insertOne(testReading);
    console.log(`   ✅ Test document inserted: ${insertResult.insertedId}\n`);

    // Verify insertion by reading it back
    const insertedDoc = await collection.findOne({ _id: insertResult.insertedId });
    console.log('   Retrieved document:');
    console.log(`   - Sensor: ${insertedDoc.sensor_id}`);
    console.log(`   - Temperature: ${insertedDoc.temperature}°C`);
    console.log(`   - Humidity: ${insertedDoc.humidity}%`);
    console.log(`   - Timestamp: ${insertedDoc.timestamp.toISOString()}\n`);

    // ==========================================
    // SUCCESS MESSAGE
    // ==========================================
    
    console.log('='.repeat(60));
    console.log('✅ SUCCESS: Both databases are connected!');
    console.log('='.repeat(60));
    console.log('\nConnections:');
    console.log(`  ✅ Redis: ${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`);
    console.log(`  ✅ MongoDB: AgriDB.readings`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ MongoDB Error:', error.message);
    
    if (MONGODB_URI.includes('<username>') || MONGODB_URI.includes('<password>')) {
      console.log('\n⚠️  Please update the MONGODB_URI with your actual connection string:');
      console.log('   1. Go to MongoDB Atlas');
      console.log('   2. Click "Connect" on your cluster');
      console.log('   3. Choose "Connect your application"');
      console.log('   4. Copy the connection string');
      console.log('   5. Replace the MONGODB_URI at the top of this file\n');
    }
  } finally {
    // Close connections
    await mongoClient.close();
    await redisClient.quit();
    console.log('Connections closed.\n');
  }
}

// ============================================
// RUN THE APPLICATION
// ============================================

connectDatabases().catch(console.error);
