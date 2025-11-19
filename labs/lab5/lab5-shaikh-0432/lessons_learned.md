Data Migration & Sharding :

1. Data Migration from SQL to NoSQL
	•	During this lab, I learned how traditional relational tables (sensors + readings) can be transformed into nested JSON documents using functional programming methods like map(), filter(), and reduce().
	•	Flattened relational joins were converted into document-oriented structures, making the data easier to query in systems like MongoDB or DynamoDB.
	•	I also learned how NoSQL migration requires thinking about document shape, not rows, and ensuring each record contains all contextual information needed downstream.

_____________________________________________________________________________________

2. Role of Metadata in Data Traceability
	•	Adding metadata fields such as UUIDs, checksums, lineage, and timestamps greatly improves observability, debugging, and auditability.
	•	Metadata ensures each document has:
	•	Integrity (checksums)
	•	Origin tracking (lineage, source tables)
	•	Versioning (createdAt, ingest batch IDs)
	•	Quality validation (quality flags)
	•	Good metadata makes data pipelines more reliable and easier to monitor in large distributed systems.

_____________________________________________________________________________________

3. Impact of Shard-Key Choice on Performance & Scalability
	•	Choosing an effective shard key is essential for preventing write hotspots in distributed databases.
	•	A composite key combining farmId + date bucket spreads writes evenly across farms and time, improving:
	•	Load balancing
	•	Throughput
	•	Scalability
	•	Fault isolation
	•	Poor shard keys cause uneven data distribution, overloaded partitions, and throttling during ingestion.

_____________________________________________________________________________________

Overall Summary

This lab showed how real-world NoSQL pipelines require:
✔ smart data modeling
✔ rich metadata for trust & traceability
✔ thoughtful sharding strategies to scale large sensor workloads

It helped bridge SQL thinking into modern distributed systems design.

_____________________________________________________________________________________
