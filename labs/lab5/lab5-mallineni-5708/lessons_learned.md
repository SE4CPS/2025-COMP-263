# Lab 5 – Lessons Learned

- **Data migration and sharding**  
  Joining SQL-style sensor and reading tables with `map()` and `reduce()` showed how tabular data can be reshaped into nested JSON tailored to an application. The same structures can then be partitioned into multiple logical shards, which is exactly what NoSQL systems do behind the scenes to scale out writes and reads.

- **Value of metadata for traceability**  
  Adding metadata such as UUIDs, checksums, lineage, batch IDs, and source information makes every document auditable. I can validate integrity, trace each record back to its original sensor and timestamp, and know which ETL job produced it, which would be critical in production when debugging or reprocessing data.

- **Impact of shard-key design**  
  The lab made it clear that the shard key is not just a technical detail. By sharding on `{farmId + dayBucket}` I distribute writes across time and farms, reduce the chance of hot partitions, and keep related data together for common queries. A poor key would have concentrated all writes into a single shard and hurt both performance and availability.
