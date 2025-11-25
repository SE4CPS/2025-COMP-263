# Lessons Learned
## 1. What I Learned About Data Migration and Sharding

Through this lab, I learned that data migration in distributed systems involves much more than copying data between databases. Effective migration requires coordinated strategies—such as incremental loading, snapshot-based transfer, dual-writes, or hybrid approaches—to maintain accuracy while minimizing downtime. I also learned that sharding fundamentally changes how data is stored and accessed because it distributes data across multiple nodes, making shard-key design, routing, and consistency crucial during migration. Successful migration in a sharded environment therefore depends on controlling data movement while preventing hotspots and ensuring that all shards remain synchronized and balanced.

## 2. How Metadata Improves Data Traceability

Metadata enhances data traceability by providing contextual information about the origin, timing, and lineage of each record. Fields such as authorship, timestamps, UUIDs, and synchronization markers help track when data was ingested, whether it has been updated, and how it moved through the pipeline. This becomes essential during migration and sharded ingestion because metadata allows developers to detect stale data, resolve conflicts, audit flows, and validate correctness. In short, metadata strengthens transparency and accountability across the entire data lifecycle.

## 3. How Shard-Key Choice Affects Performance and Scalability

I learned that shard-key selection directly shapes the performance and scalability of a sharded database. A well-designed shard key distributes writes evenly, prevents hotspots, and preserves query locality, enabling efficient horizontal scaling. Conversely, a poorly chosen shard key—such as one with low cardinality or a monotonically increasing value—can overload a single shard and limit throughput. Therefore, shard-key design must consider workload patterns, write distribution, and expected growth to ensure that the system remains balanced and scalable over time.