# Lessons Learned

## Data Migration (SQL → NoSQL)
In this lab, I learned how relational tables can be transformed into nested JSON documents using functional programming techniques such as `map()`, `filter()`, and `reduce()`. Migrating SQL rows into document-based structures requires decisions about field normalization, schema consistency, and how to represent relationships without joins.

## Importance of Metadata
Adding metadata such as checksums, lineage, units, timestamps, and batch identifiers significantly improves data traceability. Metadata makes it possible to audit where each record came from, detect data corruption, validate field quality, and fully reconstruct the transformation history from raw ingestion to final storage.

## Sharding Strategy and Performance
I learned that the shard-key determines how evenly data is distributed across partitions. Choosing a key based on `{farmId + day}` helps avoid write hotspots because sensors generate time-series data that naturally groups by date and location. A balanced shard key improves parallel writes, reduces contention, and allows the system to scale horizontally as the dataset grows.
