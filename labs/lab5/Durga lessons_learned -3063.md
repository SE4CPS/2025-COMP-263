# Lessons Learned

## 1. Data Migration and Sharding
In this lab, I learned how relational data from multiple SQL tables can be transformed into NoSQL documents. Instead of spreading information across separate tables, we merged related fields into single documents. This removes the need for joins and makes queries faster and more efficient.

I also learned how to use functional programming concepts—such as `map`, `filter`, and `reduce`—to perform the migration. These methods made the transformation logic much clearer and easier to maintain.  
Sharding was another important concept: it involves splitting large datasets across multiple servers. By dividing documents based on farm location and date, the system can distribute work evenly and support large-scale real-time data processing.

---

## 2. How Metadata Improves Data Traceability
Metadata provides important tracking details without changing the original data. We added fields such as timestamps, checksums, source information, and quality flags. These create a full audit trail allowing us to trace any document back to its origin.

Checksums were especially important—they act as digital fingerprints. If a document is altered or becomes corrupted, the checksum changes, immediately signaling that the data is no longer authentic. For sensor data, metadata ensures we know which device collected the reading, when it was processed, and whether the data quality is reliable.

---

## 3. How Shard-Key Choice Affects Performance and Scalability
I learned that the shard key is one of the most critical decisions in a distributed database. A poorly chosen shard key can overload one server while others stay idle. A well-designed shard key distributes reads and writes evenly.

Our shard key combined **farm location** with **date**, which helped avoid hotspots. Readings from different farms went to different shards, and the time component naturally separated older and newer data. This resulted in better load balancing, smoother performance, and a scalable system that can grow simply by adding more servers.

Overall, the shard-key strategy must reflect the actual access patterns of the application to ensure long-term performance and scalability.
