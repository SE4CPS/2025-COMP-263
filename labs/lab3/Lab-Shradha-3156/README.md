# Lab 3 — Neo4j → MongoDB Lake (+ IndexedDB Ingest)
**Folder:** `Lab3-Pujari-03156`

## Setup
```bash
cd labs/lab3/Lab3-Pujari-03156
cp .env.template .env
npm install
```

## Test Neo4j Connection
```bash
npm run neo4j:connect
```

## Read Graph (Farm → Device → Reading) from Neo4j
```bash
npm run neo4j:read
```

## Push Neo4j Data to MongoDB Lake
```bash
npm run neo4j:toMongo
```

## Start IndexedDB Ingest Server
```bash
npm run server
```

## Example POST Request
```bash
POST http://localhost:3000/ingest
Content-Type: application/json
```
```json
{
  "metadata": { "author": "Student Name", "last_sync": "2025-10-13T00:00:00Z" },
  "docs": [
    { "sensorId": 1, "reading": 42.5, "timestamp": "2025-10-13T00:00:00Z", "notes": "ok" }
  ]
}
```
