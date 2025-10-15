# Lab 3 – Ram Mallineni (5708)

**This repo is pre-wired for the class shared MongoDB cluster (`lab2cluster.yub3wro…`).**  
Follow these steps exactly.

## 0) Setup
1. Copy `.env.example` to `.env` and fill your secrets:
   - `NEO4J_PASSWORD=` (Aura password)
   - In `MONGO_HOST`, replace `<USER>` and `<PASSWORD>` with your Atlas user for **lab2cluster**.
2. Install deps:
   ```bash
   npm i
   ```

## 1) Q1 – Neo4j
Seed + read:
```bash
npm run neo:seed
npm run neo:read
```
Take a terminal screenshot of the table + `Rows: N`.

## 2) Q2 – Push both sources to MongoDB "lake"
- **Neo4j → lake**
  ```bash
  npm run lake:neo4j
  ```
- **IndexedDB (Lab-2 page) → lake**
  ```bash
  npm run lake:server
  # leave it running, open your Lab-2 page and click "Sync to Lake"
  ```

Every inserted document is stamped with:
`author`, `studentId`, `sourceDB`, `ingestedAt` (UTC ISO), `tags`.

(Optional) Verify counts for your author:
```bash
npm run lake:verify
```

## 3) Q3 – Compass screenshots
In **Compass**, connect to **lab2cluster.yub3wro…**, open DB **LabLake** → collection **`lake`** and run:
- All your docs:
  ```json
  { "author": "Ram Mallineni" }
  ```
- Your Neo4j only:
  ```json
  { "author": "Ram Mallineni", "sourceDB": "Neo4j" }
  ```

## Notes
- All scripts support Option‑B env names (`MONGO_HOST`, `MONGO_DB`, `MONGO_LAKE_COLLECTION`).
- Do not commit your real `.env`. Commit `.env.example` only.