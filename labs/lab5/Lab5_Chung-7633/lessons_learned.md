1. For Data Migration and Sharding
   
Through this lab, I learned how structured SQL data can be transformed into NoSQL documents using such as map, filter, and reduce. I also learned how sharding helps distribute data across multiple partitions, it improves scalability.


2. For Metadata and Traceability

Adding metadata is easier to track. Some fields such as uuid, checksum_md5, source_db, lineage, and sync_time_utc make each document easier to verify and track back to the origin. Metadata allows downstream systems to understand where the data came from and the  processes.

3. For Shard-Key Impact on Performance
   
Shard-key design affects how evenly data is distributed. A good shard key is combining farmId with reading date that spreads writes over time and across logical groups to prevent write hotspots. This improves both write performance and overall system scalability.
