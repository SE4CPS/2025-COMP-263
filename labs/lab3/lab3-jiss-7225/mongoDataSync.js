require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

class DataLakeIntegrator {
  constructor() {
    this.neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
    );

    this.mongoUri = `${process.env.MONGO_HOST}?authSource=admin&retryWrites=true&w=majority`;
    this.mongoClient = new MongoClient(this.mongoUri, {
      auth: { 
        username: process.env.MONGO_USER, 
        password: process.env.MONGO_PASS 
      }
    });
  }

  async extractIndexedDBData() {
    const indexedDBData = [
      {
        id: 'idx_001',
        sensorType: 'Temperature',
        reading: 23.5,
        timestamp: new Date().toISOString(),
        location: 'Greenhouse A',
        unit: '°C',
        deviceId: 'temp_sensor_001'
      },
      {
        id: 'idx_002', 
        sensorType: 'Humidity',
        reading: 65.2,
        timestamp: new Date().toISOString(),
        location: 'Greenhouse B',
        unit: '%',
        deviceId: 'humidity_sensor_002'
      },
      {
        id: 'idx_003',
        sensorType: 'Soil Moisture',
        reading: 42.8,
        timestamp: new Date().toISOString(),
        location: 'Field North',
        unit: '%',
        deviceId: 'soil_sensor_003'
      }
    ];

    const transformedData = indexedDBData.map(item => ({
      ...item,
      sourceDB: 'IndexedDB',
      ingestedAt: new Date().toISOString(),
      tags: ['lab3', 'indexeddb', 'agriculture', 'sensor_data'],
      author: 'Manu Mathew Jiss'
    }));

    return transformedData;
  }

  async extractNeo4jData() {
    const session = this.neo4jDriver.session();
    try {
      const query = `
        MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
        RETURN f, d, r
        LIMIT 15
      `;

      const result = await session.run(query);
      
      if (result.records.length === 0) {
        return [];
      }

      const neo4jData = result.records.map(record => {
        const farm = record.get('f').properties;
        const device = record.get('d').properties;
        const reading = record.get('r').properties;

        return {
          id: `neo4j_${device.id || device.identity?.low || Math.random().toString(36).substr(2, 9)}`,
          farmName: farm.name || farm.farmName || 'Unknown Farm',
          deviceType: device.type || device.deviceType || 'Unknown Device',
          readingValue: parseFloat(reading.value || reading.readingValue || 0),
          unit: reading.unit || 'unknown',
          timestamp: reading.timestamp || new Date().toISOString(),
          location: farm.location || farm.name || 'Unknown Location',
          farmId: farm.id || farm.identity?.low,
          deviceId: device.id || device.identity?.low,
          readingId: reading.id || reading.identity?.low,
          sourceDB: 'Neo4j',
          ingestedAt: new Date().toISOString(),
          tags: ['lab3', 'neo4j', 'graph_data', 'agriculture'],
          author: 'Manu Mathew Jiss'
        };
      });

      return neo4jData;
      
    } catch (error) {
      console.error('Error extracting Neo4j data:', error.message);
      return [];
    } finally {
      await session.close();
    }
  }

  async pushToMongoLake(indexedDBData, neo4jData) {
    try {
      await this.mongoClient.connect();
      const collection = this.mongoClient
        .db(process.env.MONGO_DB)
        .collection(process.env.MONGO_LAKE_COLLECTION);

      const allData = [...indexedDBData, ...neo4jData];
      
      if (allData.length === 0) {
        return;
      }

      const result = await collection.insertMany(allData, { ordered: false });
      
      console.log(`Data ingestion complete: ${result.insertedCount} documents processed`);
      
      return result;
      
    } catch (error) {
      console.error('Error pushing to MongoDB:', error.message);
      throw error;
    }
  }

  async runIngestionPipeline() {
    try {
      const [indexedDBData, neo4jData] = await Promise.all([
        this.extractIndexedDBData(),
        this.extractNeo4jData()
      ]);

      await this.pushToMongoLake(indexedDBData, neo4jData);
      
    } catch (error) {
      console.error('Pipeline failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    try {
      await this.neo4jDriver.close();
      await this.mongoClient.close();
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
  }
}

module.exports = DataLakeIntegrator;
