# Lab 5 – Key Takeaways

- **From SQL rows to JSON documents**  
  The exercise showed how pure `map()` and `reduce()` operations can turn two relational tables into a stream of nested JSON objects that are ready for a document database. Doing the join in code instead of SQL made the migration process feel like building an ETL step in a real data pipeline.

- **Role of metadata in data governance**  
  Adding rich metadata around each reading (who created it, when it was synced, its checksum, and the job that produced it) turns a simple sensor record into something that can be traced and audited. With these fields, I can track lineage, detect corruption, and understand the context of any record without going back to the original SQL system.

- **Choosing a shard key deliberately**  
  Sharding by a combination of farm, device, and day highlighted how much the key influences performance. A composite key that includes time and an identifier spreads writes naturally while still grouping together data that is queried together. Poor shard-key choices would have concentrated all the writes to one shard and made the system harder to scale.
