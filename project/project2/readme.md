# Project: End-to-End Database Pipeline (Weather Data for Stockton)

## Goal
Build a lightweight, end-to-end data pipeline system that collects, transforms, and visualizes average rainfall and temperature data for Stockton over the last 12 months.

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

**Example Endpoint:**


---

## 2. ETL to Cloud MongoDB Data Lake

- Store raw and enriched JSON documents.
- Include metadata fields:
  - `ingest_time_utc`
  - `record_source`
  - `transform_status`
  - `sync_type` (e.g., "full" or "partial")
- Implement a document sync trigger interval (e.g., every 30 minutes or daily) to fetch updates automatically.

**Service:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

## 3. ETL to ClickHouse Data Warehouse

**Installation:** [ClickHouse Install Guide](https://clickhouse.com/docs/install)

- Perform structured transformations such as average rainfall and temperature calculations.
- Maintain derived tables for analytics.
- Track sync metadata including:
  - `warehouse_load_time`
  - `rows_loaded`
  - `sync_interval_min`
  - `load_mode` (e.g., "incremental" or "overwrite")

---

## 4. ETL to Redis Cache

**Installation:** [Redis Downloads](https://redis.io/downloads/)

- Cache aggregated results for faster dashboard access.
- Use a time-to-live (TTL) to automatically expire stale data.
- Include metadata for cache management:
  - `cache_timestamp`
  - `data_version`
  - `refresh_interval_sec`

---

## 5. ETL to Local Dashboard

- Build a local web dashboard to visualize average rainfall and temperature.
- Data should be fetched from Redis or ClickHouse depending on freshness.
- Display a data sync indicator (full, partial, or out-of-sync).
- Optionally provide a manual **"Sync Now"** trigger.

**Framework Options:**
- [Flask](https://flask.palletsprojects.com/)
- [Express.js](https://expressjs.com/)

---

## 6. Sync and Automation Overview

| Layer | Interval | Sync Type | Notes |
|--------|-----------|------------|--------|
| API → MongoDB | |  | Fetches only recent updates |
| MongoDB → ClickHouse |  |  | Recomputes warehouse aggregates |
| ClickHouse → Redis | |  | Refreshes cache for dashboard |
| Redis → Dashboard | On-demand | Read-only | Serves cached visualization data |

