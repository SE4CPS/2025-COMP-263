1. What i learned about data migration and sharding.

Data Migration: Successfully transformed SQL sensor/reading data into NoSQL documents using map/filter/reduce operations. This taught me how to denormalize relational data into document-oriented structures suitable for horizontal scaling.

Sharding Strategy: By partitioning data using farmId + date, I learned that sharding distributes write load across multiple database instances. This prevents bottlenecks because new sensor readings spread naturally across different shards rather than overloading a single shard.

2. How metadata improves data traceability.

Metadata fields like checksum_md5, lineage, author, and sync_time_utc create a complete audit trail. They answer critical questions: Who created this data? When? From which source? Has it been modified? This traceability is essential for data quality, debugging, and compliance.

3. How shard-key choice affects performance and scalability.

 good shard key (like farmId + date) must distribute evenly, prevents hot shards by spreading writes across time and location dimensions. Allows adding new shards as data grows without rebalancing existing data.Queries filtering by farm and time can target specific shards efficiently
 A poor shard key (like just farmId) would create hotspots when one farm generates disproportionate data, limiting scalability.