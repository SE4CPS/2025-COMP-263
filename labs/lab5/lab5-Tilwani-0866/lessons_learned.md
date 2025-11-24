#​‍​‌‍​‍‌​‍​‌‍​‍‌ Lessons Learned – SQL to NoSQL Migration & Sharding (Lab - 5)

## 1. Data migration and sharding

- I learned the conversion of relational SQL tables (sensors and readings) into NoSQL style JSON documents with the help of only map, filter, and reduce, which made the data pipeline more declarative and easier to understand.

- The process of joining the readings with their sensors and then partitioning into shards demonstrated how batch migration could be depicted as a pure data flow without the need for explicit loops or stateful iterators.

- Storing data by farm and day clarified the point that migration is not only about changing the format, but it is also about how data will be distributed and accessed in a system that can scale.

## 2. Metadata and traceability

- The addition of metadata fields such as uuid, checksum_md5, sync_time_utc, source_db, source_tables, and lineage demonstrated how each document can be made to carry its own audit trail.

- Checksums and timestamps are used to locate file corruption or duplicate processing, whereas lineage and batch IDs facilitate tracing a document back to its original SQL rows and ingestion run.

- The inclusion of units and quality_flags fields made the data more self-explanatory, which thus lowers the possibility of ambiguity when the readings are debugged or analyzed at a later time.

## 3. Shard key choice, performance, and scalability

- The employment of a composite shard key based on {farmId + day} enabled the writes to be spread over several farm day buckets each of which corresponded to a different day and farm, rather than all the writes being concentrated in a single shard.

- The shard strategy in question balances the load between the tenants and the time windows, thereby helping to prevent write hotspots occurring when one farm experiences a high level of traffic.

- The selection of a proper shard key has a direct bearing on both performance and scalability as it decides how evenly the data and queries will be spread over the ​‍​‌‍​‍‌​‍​‌‍​‍‌cluster.
