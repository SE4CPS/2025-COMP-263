require("dotenv").config();
const express = require("express");
const neo4j = require("neo4j-driver");

const app = express();
const { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, NEO4J_DATABASE } = process.env;
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
const sessionFor = () => driver.session({ database: NEO4J_DATABASE });

app.get("/nodes", async (_req, res) => {
  const s = sessionFor();
  try {
    const r = await s.run("MATCH (n) RETURN n LIMIT 100");
    res.json(r.records.map(x => {
      const n = x.get("n");
      return { id: n.identity.toString(), labels: n.labels, properties: n.properties };
    }));
  } catch (e) { res.status(500).json({ error: e.message }); } finally { await s.close(); }
});

app.get("/graph", async (_req, res) => {
  const s = sessionFor();
  try {
    const r = await s.run("MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 100");
    res.json(r.records.map(rec => {
      const n = rec.get("n"), m = rec.get("m"), rel = rec.get("r");
      return {
        n: { id: n.identity.toString(), labels: n.labels, properties: n.properties },
        r: { id: rel.identity.toString(), type: rel.type, start: rel.start.toString(), end: rel.end.toString(), properties: rel.properties },
        m: { id: m.identity.toString(), labels: m.labels, properties: m.properties }
      };
    }));
  } catch (e) { res.status(500).json({ error: e.message }); } finally { await s.close(); }
});

app.listen(process.env.PORT || 3000);