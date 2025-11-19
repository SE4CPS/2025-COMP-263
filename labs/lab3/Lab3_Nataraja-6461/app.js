// app.js
import { driver, closeDriver } from './sampleNeo4jConnection.js';

async function readAgricultureGraph() {
  const session = driver.session();
  try {
    const query = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f, d, r
    `;

    const result = await session.run(query);

    console.log('--- Agriculture Graph Data ---\n');

    if (result.records.length === 0) {
      console.log('⚠️ No data found. Please insert some sample nodes first.');
      return;
    }

    result.records.forEach(record => {
      const farm = record.get('f').properties;
      const device = record.get('d').properties;
      const reading = record.get('r').properties;

      console.log(`Farm: ${farm.name || 'Unknown Farm'}`);
      console.log(`  Device Type: ${device.type || 'Unknown Device'}`);
      console.log(`  Reading Value: ${reading.value || 'N/A'} ${reading.unit || ''}`);
      console.log('----------------------------------------');
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await session.close();
    await closeDriver();
  }
}

readAgricultureGraph();
