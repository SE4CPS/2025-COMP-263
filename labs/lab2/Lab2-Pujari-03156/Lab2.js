// Question 4: MongoDB Atlas Sync Script
// Based on the exact JSON objects from Question 3

const { MongoClient } = require('mongodb');

const CONNECTION_STRING = 'mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/';
const DATABASE_NAME = 'Lab2';
const COLLECTION_NAME = 'Agriculture';

// The exact 10 objects from Question 3 JSON
const getAgricultureObjects = () => [
  {
    "_id": { "$oid": "68cc48b36f2103993b61b617" },
    "farmName": "StocktonFarm",
    "cropName": "Apple",
    "timestampLastWater": { "$date": "2025-09-15T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  },
  {
    "_id": { "$oid": "68cc48b36f2103993b61b618" },
    "farmName": "GreenAcres",
    "cropName": "Wheat",
    "timestampLastWater": { "$date": "2025-09-10T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  },
  {
    "_id": { "$oid": "68cc48b36f2103993b61b619" },
    "farmName": "SunnyFields",
    "cropName": "Corn",
    "timestampLastWater": { "$date": "2025-09-08T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  },
  {
    "_id": { "$oid": "68cc48b36f2103993b61b620" },
    "farmName": "RiverBend",
    "cropName": "Rice",
    "timestampLastWater": { "$date": "2025-09-05T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  },
  {
    "_id": { "$oid": "68cc48b36f2103993b61b621" },
    "farmName": "MountainView",
    "cropName": "Cotton",
    "timestampLastWater": { "$date": "2025-09-12T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  },
  {
    "_id": { "$oid": "68cc48b36f2103993b61b622" },
    "farmName": "PrairieWind",
    "cropName": "Barley",
    "timestampLastWater": { "$date": "2025-09-07T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  },
  {
    "_id": { "$oid": "68cc48b36f2103993b61b623" },
    "farmName": "HarvestMoon",
    "cropName": "Soybeans",
    "timestampLastWater": { "$date": "2025-09-14T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  },
  {
    "_id": { "$oid": "68cc48b36f2103993b61b624" },
    "farmName": "BlueSky",
    "cropName": "Oats",
    "timestampLastWater": { "$date": "2025-09-11T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  },
  {
    "_id": { "$oid": "68cc48b36f2103993b61b625" },
    "farmName": "RollingHills",
    "cropName": "Tomato",
    "timestampLastWater": { "$date": "2025-09-09T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  },
  {
    "_id": { "$oid": "68cc48b36f2103993b61b626" },
    "farmName": "GoldenValley",
    "cropName": "Grapes",
    "timestampLastWater": { "$date": "2025-09-13T00:00:00.000Z" },
    "farmer": "Shradha Pujari",
    "metadata": {
      "author": "Shradha Pujari",
      "last_sync": "2025-09-25T08:30:00.000Z",
      "uuid_source": "a1b2c3d4-e5f6-4789-y012-3456789abcde"
    }
  }
];

async function syncToMongoDB() {
    let client;
    
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        
        client = new MongoClient(CONNECTION_STRING);
        await client.connect();
        
        console.log('✅ Connected to MongoDB Atlas successfully!');
        
        const database = client.db(DATABASE_NAME);
        const collection = database.collection(COLLECTION_NAME);
        
        // Get the exact 10 objects from Q3
        const agricultureObjects = getAgricultureObjects();
        
        // Use filter to ensure exactly first 10 entries only (map-filter-reduce requirement)
        const exactlyTenObjects = agricultureObjects.filter((obj, index) => index < 10);
        
        console.log(`📋 Ready to insert ${exactlyTenObjects.length} objects with metadata`);
        
        // Insert exactly 10 objects to Agriculture collection
        console.log('⬆️  Inserting first 10 objects to Lab2.Agriculture collection...');
        const result = await collection.insertMany(exactlyTenObjects);
        
        console.log(`✅ Successfully inserted ${result.insertedCount} documents!`);
        
        // Verify exactly 10 documents using aggregation (map-reduce style)
        const verificationPipeline = [
            { $match: { "metadata.author": "Shradha Pujari" } },
            { $count: "total_documents" }
        ];
        
        const verificationResult = await collection.aggregate(verificationPipeline).toArray();
        const totalDocuments = verificationResult.length > 0 ? verificationResult[0].total_documents : 0;
        
        console.log(`🔍 Verification: ${totalDocuments} documents inserted successfully`);
        
        console.log('\n🎯 COMPASS VERIFICATION:');
        console.log('Query: {"metadata.author": "Shradha Pujari"}');
        console.log('Expected Result: Exactly 10 documents');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('🔐 Connection closed');
        }
    }
}

syncToMongoDB();
