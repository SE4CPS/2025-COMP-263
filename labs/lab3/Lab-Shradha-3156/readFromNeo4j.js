require('dotenv').config();
const neo4j = require('neo4j-driver');

async function main() {
    const driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
    );
    const session = driver.session();

    try {
        console.log('Running Cypher read...');
        const result = await session.run(`
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f{.*} AS farm, d{.*} AS device, r{.*} AS reading
      LIMIT 50
    `);

        if (result.records.length === 0) {
            console.log('No graph data found. Ensure Farm/Device/Reading nodes exist.');
            return;
        }

        console.log('=== Farm / Device / Reading ===');
        result.records.forEach((rec, idx) => {
            const f = rec.get('farm') || {};
            const d = rec.get('device') || {};
            const r = rec.get('reading') || {};
            const line = [
                `${idx + 1}.`,
                `Farm: ${f.name ?? JSON.stringify(f)}`,
                `Device: ${d.type ?? JSON.stringify(d)}`,
                `Reading: ${r.value ?? JSON.stringify(r.value)} @ ${r.ts ?? r.timestamp ?? 'n/a'}`
            ].join(' | ');
            console.log(line);
        });

    } catch (err) {
        console.error('Neo4j read error:', err.message);
    } finally {
        await session.close();
        await driver.close();
    }
}

main();
