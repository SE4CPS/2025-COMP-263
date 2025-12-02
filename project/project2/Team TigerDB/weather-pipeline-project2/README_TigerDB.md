# TigerDB – Weather Data Pipeline

End-to-End ETL System: API → MongoDB → ClickHouse → Redis → Dashboard

This project implements a full data engineering pipeline that retrieves historical
weather data for Stockton, CA, enriches it, aggregates it, caches it, and finally
displays it in a local dashboard. The system demonstrates multi-layer ETL,
database integration, caching strategies, and metadata lineage tracking.

---

## 📌 1. Project Overview

Our pipeline processes 12 months of daily weather data through five layers:

1. **Open-Meteo API** – retrieves daily temperature and rainfall
2. **MongoDB** – stores raw + enriched observations
3. **ClickHouse** – aggregates monthly averages and totals
4. **Redis** – caches aggregated summary with TTL
5. **Dashboard** – visualizes trends using cached or live data

Each transition between layers includes metadata fields such as timestamps,
batch IDs, sync type, warehouse stats, and caching information.

---

## 📌 2. How to Set Up and Run the Project

### ✔ Prerequisites

Install the following:

- Node.js (v18+ or higher)
- Docker Desktop
- VS Code

---

### ✔ 1️⃣ Clone Your Team Folder

```
git clone <your_repo_url>
cd TigerDB
```

---

### ✔ 2️⃣ Install Dependencies

```
npm install
```

---

### ✔ 3️⃣ Start Required Docker Containers

```
docker start mongo
docker start clickhouse
docker start redis
```

If containers do not exist, create them using:

```
docker run -d --name mongo -p 27017:27017 mongo
docker run -d --name clickhouse -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server
docker run -d --name redis -p 6379:6379 redis
```

---

### ✔ 4️⃣ Create a `.env` File

(See `.env.example` provided in this repository)

```
MONGO_URI=mongodb://localhost:27017/weather_project2
MONGO_DB=weather_project2

CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

REDIS_URL=redis://localhost:6379
PORT=4000
```

---

### ✔ 5️⃣ Run the Entire ETL Pipeline

```
node ./src/run_etl_once.js
```

Expected output:

- Running API → MongoDB
- Running MongoDB → ClickHouse
- Running ClickHouse → Redis
- ETL pipeline finished successfully

---

### ✔ 6️⃣ Start the Dashboard Server

```
node ./src/server.js
```

Open your browser:

```
http://localhost:4000
```

You will see:

- Sync Status (full/partial, timestamps)
- Average Temperature Chart
- Total Rainfall Chart

---

## 📌 3. Pipeline Components

### ✔ **API Layer (Open-Meteo)**

- Pulls 12 months of historical data
- Fields: max temp, min temp, rainfall sum
- Metadata added:
  - `source_timestamp`
  - `api_request_id`
  - `etl_batch_id`
  - `source_database`
  - `data_quality`

---

### ✔ **MongoDB Layer**

Collections:

- `raw_observations`
- `enriched_observations`

Metadata added:

- `ingest_time_utc`
- `transform_status`
- `record_source`
- `sync_type`
- `team: "TigerDB"`
- `author: "Ram Mallineni, Sai Manne"`

---

### ✔ **ClickHouse Layer**

Monthly aggregation includes:

- average max temp
- average min temp
- total rainfall

Metadata added:

- `warehouse_load_time`
- `rows_loaded`
- `sync_interval_min`
- `load_mode` (overwrite)

---

### ✔ **Redis Layer**

- Stores `weather:monthly` cache key
- TTL = 3600 seconds (1 hour)
- Prevents unnecessary ClickHouse re-queries

Metadata added:

- `cache_timestamp`
- `refresh_interval_sec`
- `data_version`

---

### ✔ **Dashboard Layer**

- Loads Redis cache if available
- Falls back to ClickHouse if cache expired
- Displays:
  - Status card
  - Avg Temperature graph
  - Total Rainfall graph

---

## 📌 4. Known Issues / Limitations

- API can return 404 if invalid date ranges are supplied.
- ClickHouse authentication and URL configuration required careful setup.
- Redis initially did not populate until ETL script path issues were fixed.
- Dashboard does not auto-refresh; must refresh manually.
- Current design handles only a single city (Stockton).

---

## 📌 5. Team Contribution Summary

**Team Name: TigerDB**

### **Ram Mallineni**

- Implemented API ingestion logic
- Designed MongoDB raw + enriched storage
- Coded MongoDB → ClickHouse aggregation script
- Implemented ClickHouse → Redis caching script
- Fixed authentication and ETL errors
- Ensured end-to-end flow stability and metadata tracking

### **Sai Manne**

- Developed the dashboard UI and front-end logic
- Implemented Redis read/fallback mechanisms
- Worked on Redis TTL configuration and debugging
- Tested ClickHouse queries and warehouse behavior
- Organized diagrams/documentation for final submission

Both team members collaborated on debugging, testing, and final integration.

---

## 📌 6. Repository Structure

```
TigerDB/
│
├── src/
│   ├── etl/
│   │   ├── etl_api_to_mongo.js
│   │   ├── etl_mongo_to_clickhouse.js
│   │   ├── etl_clickhouse_to_redis.js
│   ├── services/
│   │   ├── mongoClient.js
│   │   ├── clickhouseClient.js
│   │   ├── redisClient.js
│   ├── routes/
│   │   ├── dashboardRoutes.js
│   ├── server.js
│   ├── config.js
│
├── public/
│   ├── index.html
│   ├── dashboard.js
│   ├── styles.css
│
├── README.md
├── .env.example
├── package.json
└── TigerDB_Pipeline_Presentation.pptx
```

---

## 📌 7. Final Notes

This project demonstrates core data engineering concepts:

- ETL workflow design
- Multi-database integration
- Metadata lineage
- Cache optimization
- Backend + visualization synergy
