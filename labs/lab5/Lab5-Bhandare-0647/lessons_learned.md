# Lab 5: Lessons Learned
## SQL to NoSQL Migration - Agricultural Sensor Data


---

## 1. What I Learned About Data Migration and Sharding

### Data Migration Insights
- **Functional Programming Power**: Using `map()`, `filter()`, and `reduce()` provides a clean, declarative approach to data transformation without mutating original data
- **Schema Transformation**: Successfully converted normalized relational data (separate sensors and readings tables) into denormalized JSON documents suitable for NoSQL databases
- **Data Integrity**: Maintaining referential integrity during migration requires careful validation to ensure all readings match their corresponding sensors
- **Scalability Considerations**: NoSQL's document model allows for easier horizontal scaling compared to traditional SQL JOIN operations

### Sharding Insights
- **Distribution Strategy**: Effective sharding requires understanding both data access patterns and write distribution
- **Composite Keys**: Using `{farmId}_{dayBucket}` as a shard key provides better distribution than single-field keys
- **Write Hotspot Prevention**: Time-based partitioning (daily buckets) spreads writes across multiple shards naturally
- **Query Performance**: Shard key design directly impacts query efficiency - our farm+day approach optimizes for common query patterns (filtering by farm and date range)

---

## 2. How Metadata Improves Data Traceability

### Metadata Benefits Discovered

1. **Lineage Tracking**
   - The `lineage` field shows exactly where data originated (which SQL tables and join operations)
   - Enables data debugging and audit trails
   - Example: `"lineage": "SQL:sensors[sensor_id=SNS-1042] JOIN SQL:readings[reading_id]"`

2. **Data Quality Assurance**
   - `checksum_md5`: Validates data integrity during transfer
   - `quality_flags`: Tracks data validation status and sensor health
   - Helps identify corrupted or suspicious data

3. **Operational Intelligence**
   - `sync_time_utc`: Tracks when data was migrated
   - `ingest_batch_id`: Groups data for batch processing and rollback
   - `source_db`: Documents the origin system for troubleshooting

4. **Version Control**
   - `schema_version` and `migration_version`: Enables schema evolution tracking
   - Critical for maintaining multiple data versions during gradual migration

5. **Compliance and Governance**
   - `data_classification`: Supports security and privacy requirements
   - `retention_days`: Automates data lifecycle management
   - `author`: Creates accountability for data transformation

### Real-World Impact
With proper metadata, we can:
- Trace any data anomaly back to its source
- Rollback specific batches if issues are detected
- Generate audit reports for compliance
- Debug production issues efficiently
- Manage data retention policies automatically

---

## 3. How Shard-Key Choice Affects Performance and Scalability

### Our Shard Key Strategy: `{farmId}_{dayBucket}`

#### Performance Benefits

1. **Write Distribution**
   - Writes are distributed across farm-day combinations
   - Prevents all writes from going to a single "hot" shard
   - As more farms come online, writes naturally spread across more shards

2. **Query Optimization**
   - Farm-specific queries hit a limited set of shards
   - Date-range queries can target specific day buckets
   - Reduces cross-shard queries for common access patterns

3. **Balanced Load**
   - Each farm-day combination creates a new shard
   - Prevents data skew where one shard becomes disproportionately large
   - Enables parallel processing across shards

#### Scalability Benefits

1. **Horizontal Scaling**
   - New shards are created automatically as new farms and days are added
   - Each shard can be distributed to different physical nodes
   - No single point of contention

2. **Independent Growth**
   - Each farm can scale independently based on its sensor count
   - Time-based partitioning keeps shard sizes manageable
   - Old shards can be archived while keeping recent data hot

3. **Maintenance Flexibility**
   - Individual shards can be backed up, restored, or migrated independently
   - Historical shards can be moved to cold storage
   - Reduces downtime during maintenance operations

### Alternative Approaches (and why we avoided them)

| Shard Key | Pros | Cons | Why Not Chosen |
|-----------|------|------|----------------|
| `sensor_id` only | Simple | All readings for one sensor go to same shard; creates hotspots for busy sensors | Poor write distribution |
| `timestamp` only | Time-based partitioning | All sensors writing at same time hit same shard | Write hotspots during peak hours |
| `hash(deviceId)` | Even distribution | Queries often need cross-shard operations; loses locality | Query performance suffers |
| `farmId` only | Farm locality | Large farms create huge shards; small farms waste resources | Data skew issues |

### Performance vs. Scalability Trade-offs

- **Granularity**: Daily buckets balance between too many small shards and too few large shards
- **Query Patterns**: Optimized for "show me farm X's data for date range Y" (common use case)
- **Write Pattern**: Distributes real-time sensor writes across farm-day combinations
- **Rebalancing**: Minimal need for shard rebalancing as data grows naturally

---

## Key Takeaways

1. **Data migration is not just data copying** - it requires thoughtful transformation, validation, and enrichment
2. **Metadata is the foundation of data governance** - it enables traceability, quality control, and compliance
3. **Shard key design is critical** - it determines scalability, performance, and operational complexity
4. **Functional programming patterns** - provide elegant solutions for data transformation pipelines
5. **Think about future growth** - design for scale from the beginning, even with small datasets

---

## Applications to Real-World Systems

This lab directly applies to:
- **IoT sensor networks** (agriculture, smart cities, industrial monitoring)
- **Time-series databases** (financial data, application metrics)
- **Multi-tenant systems** (SaaS platforms with customer isolation)
- **Log aggregation systems** (application logs, security events)
- **E-commerce platforms** (order data partitioned by customer and date)

---

**Conclusion**: Understanding the interplay between data structure, metadata, and distribution strategy is fundamental to building scalable, maintainable data systems. This lab demonstrated that thoughtful design at the migration stage pays dividends in system performance and operational simplicity.
