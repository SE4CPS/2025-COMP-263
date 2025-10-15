// labs/lab3/Neo4jConnection.js
require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function main() {
    const session = driver.session();
    try {
        const res = await session.run('RETURN "Connected to Neo4j Aura!" AS status');
        console.log(res.records[0].get('status'));
    } catch (err) {
        console.error('Neo4j connection error:', err.message);
    } finally {
        await session.close();
        await driver.close();
    }
}

main();