# Project: End-to-End Database Pipeline (Weather Data for Stockton)

## Goal
Build a lightweight, end-to-end data pipeline system that collects, transforms, and visualizes average rainfall and temperature data for Stockton over the last 12 months.

![System Architecture](./Sample/architecture.png)

---

## 1. Source Database

**API:** [National Weather Service Web API](https://www.weather.gov/documentation/services-web-api)

- Query historical weather data (temperature, rainfall, humidity, etc.)
- Extract only data for **Stockton, CA**
- Include metadata such as:
  - `source_timestamp`
  - `source_database`
  - `data_quality`
  - `api_request_id`
  - `etl_batch_id`

**Example Endpoint:** *(Insert your chosen endpoint here.)*

---

## 2. ETL to Cloud MongoDB Data Lake

- Store raw and enriched JSON documents.
- Include metadata fields:
  - `ingest_time_utc`
  - `record_source`
  - `transform_status`
  - `sync_type` (e.g., "full" or "partial")
- Implement a document sync interval (e.g., 30 minutes or daily).

**Service:** MongoDB Atlas

![MongoDB Atlas View](./Sample/mongodb.png)

---

## 3. ETL to ClickHouse Data Warehouse

**Installation:** [ClickHouse Install Guide](https://clickhouse.com/docs/install)

- Perform structured transformations like:
  - average rainfall
  - average temperature
- Maintain derived analytical tables.
- Track warehouse metadata:
  - `warehouse_load_time`
  - `rows_loaded`
  - `sync_interval_min`
  - `load_mode` ("incremental" or "overwrite")

![ClickHouse Table View](./Sample/clickhouse.png)

---

## 4. ETL to Redis Cache

**Installation:** [Redis Downloads](https://redis.io/downloads/)

- Cache aggregated results for fast dashboard access.
- Use TTL to expire stale data.
- Include cache metadata:
  - `cache_timestamp`
  - `data_version`
  - `refresh_interval_sec`

![Redis CLI Example](./Sample/redis1.png)

---

## 5. ETL to Local Dashboard

- Visualize rainfall and temperature metrics.
- Data source:
  - Redis if fresh
  - ClickHouse fallback
- Show sync-state indicator.
- Optional: **Manual Sync Now** button.

**Framework Options:**
- Flask
- Express.js

![Dashboard Example](./Sample/dashboard1.png)

---

## 6. Sync and Automation Overview

| Layer | Interval | Sync Type | Notes |
|--------|-----------|------------|--------|
| API → MongoDB |  |  | Fetches only recent updates |
| MongoDB → ClickHouse |  |  | Recomputes warehouse aggregates |
| ClickHouse → Redis |  |  | Refreshes cached analytics |
| Redis → Dashboard | On-demand | Read-only | Serves visualization data |

![Docker / Pipeline Overview](./Sample/docker.png)
