# Lab 5 – Lessons Learned
**Author:** Parth Shah  
**Course:** COMP 263 – Data Systems  
**Lab:** SQL → NoSQL Migration and Sharding

---

## 🧠 1. What I Learned About Data Migration and Sharding
- I learned how to use **functional programming methods (map, filter, reduce)** to transform structured SQL data into flexible NoSQL JSON documents.  
- By merging the `Sensor` and `Reading` tables, I saw how relational joins can be simulated with reduce and map to create self-contained NoSQL records.  
- Sharding demonstrated how large-scale data can be partitioned to achieve **horizontal scalability** and balance writes across multiple clusters.

---

## 🧩 2. How Metadata Improves Data Traceability
- Adding metadata like `uuid`, `checksum_md5`, `ingest_batch_id`, and `lineage` helps ensure **data provenance and quality tracking** throughout the pipeline.  
- Metadata fields make it easier to **trace errors**, validate data integrity, and confirm synchronization between SQL and NoSQL systems.  
- Quality flags and timestamps also provide better visibility into data collection and ingestion timelines.

---

## ⚙️ 3. How Shard-Key Choice Affects Performance and Scalability
- I used a shard key based on **farmId + day (YYYY-MM-DD)**, which spreads writes across farms and time intervals to prevent hotspots during high-load hours.  
- This design aligns with natural query patterns, such as “show daily readings for a specific farm,” and ensures faster lookups.  
- A good shard key directly improves **load balancing, write throughput, and scalability** of distributed NoSQL clusters.

---

## 🌱 Summary
This lab helped me understand how SQL-to-NoSQL migration involves both **data transformation and architectural design**.  
By combining functional programming with sharding and metadata enrichment, I experienced how modern data systems maintain scalability, reliability, and traceability in real-world agricultural IoT use cases.
