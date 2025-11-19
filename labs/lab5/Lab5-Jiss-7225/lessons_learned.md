## Data Migration and Sharding

This lab taught me how to transform relational database tables into NoSQL documents. Instead of keeping data in separate tables, we merged related information into single documents. This makes data retrieval faster because you don't need to join tables every time.

I used functional programming methods like map, filter, and reduce to perform the migration. This approach made the code cleaner and easier to follow compared to traditional loops.

Sharding splits large datasets into smaller pieces based on specific criteria. We divided documents by farm location and date, allowing different servers to handle different portions simultaneously. This is crucial for handling massive amounts of data efficiently.

## How Metadata Improves Data Traceability

Metadata adds tracking information to documents without changing the actual data. We included checksums, timestamps, source information, and quality flags. These fields create an audit trail that lets you trace data back to its origin.

The checksum is particularly useful because it creates a unique fingerprint for each document. If data gets accidentally modified, the checksum changes and alerts you to the problem. For sensor data from farms, knowing which device collected a reading and when it was processed is essential for troubleshooting issues.

## How Shard-Key Choice Affects Performance and Scalability

The shard key determines how data gets distributed across servers. A poor choice creates bottlenecks where one server gets overwhelmed. A good choice spreads the workload evenly.

Our shard key combined farm location with date. When multiple farms send data simultaneously, each farm's data goes to different shards, preventing write hotspots. The time component organizes data naturally, with older readings in separate shards from newer ones.

This strategy allows the system to scale by adding more servers as data grows. The key lesson is that shard keys should match how your application actually reads and writes data.

