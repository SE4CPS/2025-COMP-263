# Stockton Weather Data Pipeline  
**End-to-End Database Pipeline: API → MongoDB → ClickHouse → Redis → Dashboard**

This project implements a complete end-to-end data pipeline that collects historical weather data for **Stockton, CA**, stores it in MongoDB, transforms and loads it into ClickHouse for analytics, caches aggregated results in Redis, and visualizes the data on a local dashboard.

The pipeline also tracks **full ETL metadata at every stage** for traceability and auditing.

---

## Pipeline Architecture
Weather API
→
MongoDB (Raw + Enriched Data)
→
ClickHouse (Data Warehouse + Aggregations)
→
Redis (Cache with TTL)
→
Local Dashboard (Charts + Sync Status)


---

## Technologies Used

- **Node.js** – ETL scripts and services  
- **MongoDB Atlas** – Raw and enriched data lake  
- **ClickHouse** – Analytical data warehouse  
- **Redis** – In-memory caching with TTL  
- **Express / Frontend UI** – Dashboard backend and visualization  
- **Chart.js** – Data visualization  

---

## Setup & Installation

### 1. Prerequisites

Make sure you have installed:

- Node.js (v18+ recommended)
- MongoDB Atlas account
- ClickHouse Server
- Redis Server

### 2. Clone the Repository

**git bash**

git clone https://github.com/iDarshanaPatil/Weather-Database-System.git

cd Weather-Database-System

### 3. Install Node.js Dependencies

npm install

### 4. Environment Variables

Create your .env file in the root directory

---

## How to Run the Pipeline

### Step 1: API → MongoDB

- node fetchStocktonWeather.js

Stores raw and enriched data with source metadata.

### Step 2: MongoDB → ClickHouse

- node etlToClickHouse.js

Creates tables automatically

Loads daily weather records

Builds monthly aggregations

Tracks warehouse metadata:
- warehouse_load_time
- rows_loaded
- sync_interval_min
- load_mode (incremental)

### Step 3: ClickHouse → Redis

- node clickhouseToRedis.js

Caches monthly aggregates with TTL.

### Step 4: Start Dashboard

- node dashboard.js

Open: http://localhost:3000

---

## Components (Brief)

- API – Fetches historical Stockton weather data
- MongoDB – Stores raw + enriched documents with source metadata
- ClickHouse – Stores analytical tables and monthly aggregates
- Redis – Caches aggregated results for fast access
- Dashboard – Visualizes temperature & rainfall trends with sync status

---

## Known Issues & Limitations

The pipeline is currently run manually (no automated scheduling with cron).

The system is designed for one city only (Stockton, CA).

Redis caching uses a single cache key, not optimized for multiple regions.

Error handling and logging are basic for academic demonstration.

Schema changes require a manual reload of ClickHouse tables.

The dashboard is intended for local use only, not production deployment.

---

## Project Status

All stages complete:
API ✅ MongoDB ✅ ClickHouse ✅ Redis ✅ Dashboard ✅

---

## Team - DaSh-MaTh

- **Darshana Prafulla Patil**
- **Thai Dang Khoa Tran**
- **Manu Mathew Jiss**
- **Shradha Devendra Pujari**
