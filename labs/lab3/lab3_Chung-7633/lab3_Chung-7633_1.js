require('dotenv').config();
const neo4j = require('neo4j-driver');

async function main() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    const query = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f.name AS Farm, d.type AS Device,
             coalesce(r.tempC, r.value, r.humidity) AS Reading
    `;
    const result = await session.run(query);

    const rows = result.records.map(rec => ({
      Farm: rec.get('Farm'),
      Device: rec.get('Device'),
      Reading: rec.get('Reading')
    }));

    console.log('Result：');
    console.table(rows);

  } catch (error) {
    console.error('Error：', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();