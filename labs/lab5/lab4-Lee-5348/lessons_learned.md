Lab 5 – Lessons Learned

### Data Migration and Sharding

I learned how structured SQL data can be transformed into nested NoSQL documents using functional programming. The process of joining sensor metadata with readings and reformatting them into JSON documents helped me better understand real-world data ingestion pipelines. Sharding by `{farmId + date}` distributes load effectively and avoids hotspots.

### Metadata and Traceability

Adding metadata fields like `uuid`, `checksum_md5`, `lineage`, and `sync_time` improves data traceability, auditability, and quality assurance. It allows systems to verify integrity, track the origin of each reading, and manage synchronization history.

### Shard-Key Design and Scalability

Shard key choice has a direct impact on write scalability and performance. A poorly chosen shard key can create imbalanced partitions or overload a single node. By combining `farmId + day`, we ensured that writes were spread across shards by both geography and time, achieving more balanced and parallel writes.
