# Stockton Weather Pipeline — End-to-End ETL Project  
**COMP 263 — Project 2**  
**Team Epic: Deepika • Shreya • Tarun • Srinath**

This project implements a full **end-to-end data engineering pipeline** that collects, stores, transforms, caches, and visualizes **12 months of weather data for Stockton, CA**.

The pipeline uses **API → MongoDB → ClickHouse → Redis → Dashboard**.

---

#  **Architecture Overview**

Open-Meteo API
↓
MongoDB Atlas (Raw + Enriched Collections)
↓
ClickHouse (Aggregated Daily Weather Table)
↓
Redis (Cached Aggregates for Dashboard)
↓
Node.js Dashboard (Charts + JSON)


---

#  **Features**

###  API Fetch Layer
- Fetches **real-time** and **last 12 months** historical weather data  
- Adds metadata:  
  `source_timestamp`, `api_request_id`, `etl_batch_id`, `data_quality`, `author`, `team_name`  

###  MongoDB Data Lake
- Stores:
  - `raw_observations`  
  - `enriched_observations` (1 row per day)

###  ClickHouse Data Warehouse
- Creates database: `stockton_weather`  
- Table: `daily_weather`
- Stores structured, analytics-ready rows  
- Supports fast aggregation

###  Redis Cache
- Caches full dataset for **600 seconds**  
- JSON response for dashboard speed

###  Node.js Dashboard
- Modern UI with two charts:
  - **Max/Min Temperature Line Chart**
  - **Precipitation Bar Chart**
- Metadata badges (source, TTL, row count)
- Raw JSON viewer for grading/debugging

---

#  **Tech Stack**

| Layer | Technology |
|-------|------------|
| API Client | Node.js + Axios |
| Data Lake | MongoDB Atlas |
| Warehouse | ClickHouse (Docker) |
| Cache | Redis (Docker) |
| Dashboard | Express.js + Chart.js |
| Orchestration | Manual ETL scripts |

---

# **Project Structure**

stockton_weather_pipeline(P2)/
│
├── apiClient.js
├── mongoIngest.js
├── etl_mongo_to_clickhouse.js
├── etl_clickhouse_to_redis.js
├── dashboard_express.js
│
├── .env
├── package.json
├── README.md ← (this file)


---

#  **Environment Variables (`.env`)**
===== MongoDB Atlas =====

MONGO_URI=mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/
MONGO_DB=Project2
MONGO_RAW_COLLECTION=raw_observations
MONGO_ENRICHED_COLLECTION=enriched_observations

===== ClickHouse =====

CLICKHOUSE_URL=http://localhost

CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=stockton_weather

===== Redis =====

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL_SECONDS=600

===== Team Metadata =====

TEAM_NAME=Team Epic
AUTHOR_NAME=Deepika , Shreya , Tarun , Srinath

---

# Team Members
# Team Epic
1.Deepika
2.Shreya
3.Tarun
4.Srinath