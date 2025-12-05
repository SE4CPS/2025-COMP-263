# Lessons Learned

## 1. Data Migration & Map/Filter/Reduce
Through Lab 5, I learned how structured SQL tables can be transformed into NoSQL-style nested documents using only **map()**, **filter()**, and **reduce()**.  
Without SQL JOINs, all merge logic must be implemented manually:  
**normalize → join → enrich → shard**.  
This gave me a clearer understanding of how data actually flows step-by-step in a pipeline.

## 2. Metadata for Traceability
Metadata taught me how important data lineage and auditability are in real systems.  
Fields such as **checksum_md5**, **author**, **source tables**, **sync time**, and **quality flags** create a transparent history of each record — where it came from, how it was generated, and if it passed quality checks.  
This is essential for debugging, compliance, and reliable analytics.

## 3. Shard-Key Design & Scalability
Sharding using **farmId + day** showed me how the shard key directly affects performance.  
A good shard key avoids hotspots by evenly distributing writes across multiple partitions.  
Poor shard-key choices cause bottlenecks, write contention, and uneven load.  
This exercise helped me understand how horizontal scaling and distributed systems handle large data workloads.