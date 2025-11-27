# Team Black — Weather Data Pipeline  
API → MongoDB → ClickHouse → Redis → Dashboard

## Project Overview
This project implements a complete data engineering pipeline that retrieves Stockton weather data, stores it in MongoDB, loads enriched data into ClickHouse for analytical queries, caches aggregated results in Redis, and visualizes trends through a Flask dashboard.

Pipeline flow:
API
→ MongoDB (raw_observations and enriched_observations)
→ ClickHouse (aggregated warehouse table)
→ Redis (cached metrics)
→ Flask Dashboard (visualization)

## Repository Structure

```
Team Black/
│
├── .env
├── api.py
├── app.py
├── mongo_to_clickhouse_enriched.py
├── clickhousetoreddit_agg.py
├── dashboard_app.py
│
└── templates/
      └── index.html
```


## How to Set Up and Run Project

1. Start MongoDB, ClickHouse, and Redis locally.  
   Ensure all services are running before executing scripts.

2. Load 90-day weather data into MongoDB:  
   `python api.py`  
   This fetches historical weather data and stores it in `enriched_observations`.

3. Transfer enriched data from MongoDB to ClickHouse:  
   `python mongo_to_clickhouse_enriched.py`
   
4. Generate Redis cache from ClickHouse aggregated results:  
   `python clickhousetoreddit_agg.py`
   
5. Start the Flask dashboard:  
   `python dashboard_app.py`

6. Open the dashboard in a browser:  
http://127.0.0.1:5000
  
Optional: Press “Sync Data” in the dashboard to reload data from ClickHouse and refresh Redis.


## Component Descriptions

### 1. API Extraction (api.py)
Fetches 90-day historical weather data from the Open-Meteo API. Produces structured records containing maximum temperature, minimum temperature, calculated average temperature, and precipitation totals.

### 2. MongoDB Storage
Collections used:

- `raw_observations`: stores raw API responses.
- `enriched_observations`: stores cleaned and enriched documents with:
  - temperature metrics  
  - precipitation metrics  
  - precipitation category  
  - metadata including author, team, timestamps, source details, data version, and sync type

### 3. ClickHouse Warehouse
Enriched documents are loaded into ClickHouse for analytical queries such as average temperature and average rainfall. The column-oriented design allows efficient aggregation.

### 4. Redis Cache
Stores aggregated metrics from ClickHouse to speed up dashboard loading. Keys include:

- `weather:avg_temperature_c`
- `weather:avg_rainfall_mm`
- `weather:last_updated`

A TTL of 3600 seconds ensures that cached results refresh regularly.

### 5. Dashboard (Flask + Chart.js)
The dashboard displays:

- average temperature  
- average rainfall  
- 90-day temperature trend  
- 90-day rainfall trend  

It reads from Redis when cached results exist; otherwise it falls back to ClickHouse.

## Known Issues or Limitations
- Open-Meteo supports a maximum of 90 historical days.
- Redis cache must be repopulated after a Redis restart.
- Dashboard is intended for local execution rather than deployment.

## Team Contribution

**Team Name:** Team Black

**Member 1: Yu-Tai Lee**  
Weather Data Engineer, MongoDB Data Lake Developer  
Responsible for API extraction, data cleaning, and building MongoDB raw and enriched layers.

**Member 2: Farheen**  
ClickHouse Warehouse Engineer, Redis Cache Specialist, Dashboard Developer  
Developed ClickHouse warehouse tables, aggregation logic, and Redis caching integration.

**Member 3: Cheng Han Chung**  
Full-Stack Integrator, Pipeline Orchestrator  
Integrated the full pipeline end-to-end and connected backend processes to the dashboard interface.
