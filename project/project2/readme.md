# 🌦️ Weather Data Pipeline

This project implements a lightweight, end-to-end data engineering pipeline that collects, stores, transforms, caches, and visualizes weather data (rainfall and temperature) for Stockton, California.

The pipeline spans:
- API ingestion  
- Cloud data lake (MongoDB)  
- Data warehouse (ClickHouse)  
- In-memory cache (Redis)  
- Local dashboard  
- Automated sync flow  

---

## 📌 System Architecture

| Architecture Diagram |
|----------------------|
| ![architecture](./Sample/architecture.png) |

---

# 1. Source Database (API Layer)

**API:**  
[National Weather Service Web API](https://www.weather.gov/documentation/services-web-api)

The system queries historical weather data for **Stockton, CA**, including:
- Temperature  
- Rainfall  
- Humidity  
- Wind speed  
- Metadata such as: `source_timestamp`, `data_quality`, `api_request_id`, `etl_batch_id`

This creates the raw data foundation for the pipeline.

---

# 2. ETL → MongoDB Data Lake

| MongoDB View |
|--------------|
| ![mongodb](./Sample/mongodb.png) |

MongoDB Atlas stores **raw and enriched JSON documents**.

Each record contains metadata:
- `ingest_time_utc`
- `record_source`
- `transform_status`
- `sync_type` (full or partial)

Automated ingestion may run every 30 minutes or once daily.

---

# 3. ETL → ClickHouse Data Warehouse

| ClickHouse Screens |
|--------------------|
| ![clickhouse](./Sample/clickhouse.png) |
| ![clickhouse2](./Sample/clickhouse2.png) |
| ![clickhouse3](./Sample/clickhouse3.png) |
| ![clickhouse4](./Sample/clickhouse4.png) |

ClickHouse provides analytics-grade storage and processing:

Transformations include:
- Average rainfall (monthly, weekly, daily)
- Average temperature
- Aggregation tables for dashboard queries

Metadata tracked:
- `warehouse_load_time`
- `rows_loaded`
- `sync_interval_min`
- `load_mode` (incremental or overwrite)

---

# 4. ETL → Redis Cache

| Redis Screens |
|---------------|
| ![redis1](./Sample/redis1.png) |
| ![redis2](./Sample/redis2.png) |
| ![redis3](./Sample/redis3.png) |
| ![redis5](./Sample/redis5.png) |

Redis caches the latest computed metrics for fast dashboard rendering.

Cache metadata:
- `cache_timestamp`
- `data_version`
- `refresh_interval_sec`

TTL ensures data expires automatically if not refreshed.

---

# 5. Local Dashboard (Visualization Layer)

| Dashboard Screens |
|-------------------|
| ![dashboard1](./Sample/dashboard1.png) |
| ![dashboard2](./Sample/dashboard2.png) |
| ![dashboard3](./Sample/dashboard3.png) |
| ![dashboard4](./Sample/dashboard4.jpg) |
| ![dashboard4b](./Sample/dashboard4.png) |
| ![dashboard5](./Sample/dashboard5.png) |
| ![dashboard6](./Sample/dashboard6.png) |
| ![dashboard7](./Sample/dashboard7.jpeg) |
| ![dashboard7b](./Sample/dashboard7.png) |
| ![dashboard8](./Sample/dashboard8.png) |
| ![dashboard9](./Sample/dashboard9.png) |

Features:
- Displays rainfall and temperature metrics  
- Reads from Redis (fresh data) or ClickHouse (fallback)  
- Sync status indicator (full / partial / stale)  
- Optional **Sync Now** button  

Framework options:
- Flask  
- Express.js  

---

# 6. Sync & Automation Overview

| Docker / Services |
|-------------------|
| ![docker](./Sample/docker.png) |

### Sync Flow

| Layer | Interval | Sync Type | Description |
|-------|----------|-----------|-------------|
| API → MongoDB | scheduled | update-only | Fetch latest weather data |
| MongoDB → ClickHouse | scheduled | aggregate | Build warehouse tables |
| ClickHouse → Redis | scheduled | incremental refresh | Prepare quick dashboard access |
| Redis → Dashboard | on-demand | read-only | Serve visualizations |

---

# 📁 Folder Structure

