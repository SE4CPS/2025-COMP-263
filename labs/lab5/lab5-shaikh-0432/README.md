# COMP 263 – Lab 5  

### Data Migration, Metadata Enrichment, and Sharding  
**Student:** Farheen Shaikh  
**ID (Last 4 Digits):** 0432  
**Folder:** lab5-shaikh-0432  

---

## Overview
This lab simulates a real-world data engineering task where SQL-style relational tables are migrated into a NoSQL document model using functional programming techniques in Node.js. The goal is to practice data transformation, metadata management, and shard-key design for scalable distributed databases.

---

##  Files Included

| File | Purpose |
|------|---------|
| **lab5_starter.js** | Main script containing SQL → JSON migration, metadata enrichment, and sharding logic using map(), reduce(), filter() |
| **sql_sensors.js** | Mock dataset representing the SQL `sensors` table |
| **sql_readings.js** | Mock dataset representing the SQL `readings` table |
| **lessons_learned.md** | Summary of key concepts learned in Lab 5 |
| **README.md** | You are reading this file |

---

##  Features Implemented

### **1. SQL → NoSQL Migration**
- Joined sensor metadata with time-series readings using **map()** and **reduce()**
- Produced nested JSON documents ready for NoSQL ingestion (MongoDB/DynamoDB style)

### **2. Metadata Enrichment (15 Fields)**
Metadata includes:
- UUIDs  
- Checksums (MD5)  
- Source tables  
- Ingest batch ID  
- Units  
- Quality flags  
- Lineage tracking  
- Sync timestamps  
- Version info  
- Shard key  
- Processing time  
- More…

### **3. Sharding**
- Composite shard key:  
  **`farmId + date bucket (YYYY-MM-DD)`**
- Reduced into shard groups using **reduce()**
- Output includes a shard summary for verification

---

##  How to Run

From inside the `lab5-shaikh-0432` folder:

```bash
node lab5_starter.js
