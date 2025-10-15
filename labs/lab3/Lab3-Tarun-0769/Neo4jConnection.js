require('dotenv').config();
const neo4j = require('neo4j-driver');

function requireEnv(keys) {
  const missing = keys.filter(k => !process.env[k] || process.env[k].trim() === '');
  if (missing.length) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
}

requireEnv(['NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD']);

async function main() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
  );
  const session = driver.session();

  try {
    const res = await session.run('RETURN "Connected to Neo4j!" AS status');
    console.log(res.records[0].get('status'));
  } catch (err) {
    console.error('Neo4j connection error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();