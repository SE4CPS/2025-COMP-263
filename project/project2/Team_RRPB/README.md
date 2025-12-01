# 📊 Stockton Weather Pipeline Dashboard

End-to-end weather data analytics pipeline that collects **Stockton weather history from Open-Meteo**, processes it across **MongoDB → ClickHouse → Redis**, and displays it through a **Vite + React dashboard**.

This project demonstrates:

✔ ETL Workflow Design  
✔ Multi-Database Architecture  
✔ Columnar Storage + Fast Querying (ClickHouse)  
✔ Performance Caching via Redis  
✔ End-to-End Data → Visualization Pipeline  


---

## 🧭 System Architecture

Open-Meteo API → MongoDB → ClickHouse → Redis → Backend API → React Dashboard

| Component | Responsibility |
|---|---|
| **MongoDB** | Stores raw imported JSON data |
| **ClickHouse** | Analytical engine + aggregated summaries |
| **Redis** | Cache layer for instant reads |
| **Backend (Node + Express)** | Serves REST API to frontend |
| **Frontend (Vite + React)** | Weather Dashboard UI |

---

## 📁 Project Structure
```
weather_dashboard/
├── backend/
│   └── server.js                  # REST API server (Express)
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── vite.config.js
│   └── package.json
│
├── populateMongodb.js             # Fetch weather → MongoDB
├── populateClickhouseFromMongo.js # ETL: MongoDB → ClickHouse
├── sync_redis.js                  # Cache aggregation → Redis
├── .env.template                  # Example environment variables
└── README.md
```
---

## 🚀 Setup & Run Instructions

### 1️⃣ Install & Run Databases

You must have running instances of:

| Service | Usage |
|---|---|
| MongoDB | Stores raw API data |
| ClickHouse | Analytics + aggregation |
| Redis | Cache for fast API reads |

---

### 2️⃣ Ingest Weather Data → MongoDB

node populateMongodb.js

The script automatically:

- Calls Open-Meteo API (past 1 year)
- Validates & parses JSON
- Saves records into MongoDB

API reference:  
https://archive-api.open-meteo.com/v1/archive?{params}

---

### 3️⃣ ETL: MongoDB → ClickHouse

CREATE TABLE IF NOT EXISTS default.weather_hourly (
  time DateTime,
  temperature Float32,
  rain Float32,
  relative_humidity Float32,
  soil_temperature Float32,
  soil_moisture Float32
) ENGINE = MergeTree ORDER BY time;

node populateClickhouseFromMongo.js

#### Create Aggregation View

CREATE VIEW daily_weather_summary AS
SELECT
  toDate(time) AS report_date,
  round(sum(rain),2) AS total_rain,
  round(max(temperature),1) AS max_temp,
  round(min(temperature),1) AS min_temp,
  round(avg(temperature),1) AS avg_temp,
  round(avg(soil_moisture),4) AS soil_moisture,
  round(max(relative_humidity),1) AS peak_humidity
FROM weather_hourly
GROUP BY report_date;

SELECT * FROM daily_weather_summary;

---

### 4️⃣ Aggregate Data → Redis Cache

node sync_redis.js

Redis enables:

- Instant response times  
- Reduced load on ClickHouse  
- Smooth real-time dashboard UX  

---

### 5️⃣ Backend REST API

Frontend → Backend → Redis (hit)
                      ↳ ClickHouse → Redis (miss refresh)

Outputs formatted JSON to frontend for UI display.

---

### 6️⃣ Frontend (Vite + React)

Visualizer provides:

- Daily temperature, rainfall, humidity  
- API-fetched metrics from backend  
- Responsive UI layout  
- Powered by Vite HMR for fast builds  

---

## ❗ Known Issues & Limitations

| Issue | Notes |
|---|---|
| Open-Meteo field selection difficult | Many attributes, required filtering |
| No continuous server ingestion | Gaps may occur when app is offline |
| ClickHouse schema tuning required | Correct datatypes affect query speed |
| Timestamp mismatch initially broke inserts | Missing seconds formatting |
| Dashboard attributes evolving | More can be added to aggregation |

---
