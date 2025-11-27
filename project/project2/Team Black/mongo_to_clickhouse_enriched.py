from pymongo import MongoClient
from clickhouse_driver import Client as CHClient
from datetime import datetime, timedelta

# ---------- CONFIG ----------
MONGO_URI = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/"
DB_NAME = "Project2"
ENRICHED_COLL = "enriched_observations"

CH_HOST = "localhost"
CH_PORT = 9000
CH_DB   = "Project2"      # ClickHouse database name
CH_TABLE = "enriched_observations"


def ensure_table(ch: CHClient):
    """Create ClickHouse table if it does not exist."""
    ch.execute(f"CREATE DATABASE IF NOT EXISTS {CH_DB}")

    ch.execute(f"""
        CREATE TABLE IF NOT EXISTS {CH_DB}.{CH_TABLE} (
            date                String,

            city                String,
            state               String,
            lat                 Float32,
            lon                 Float32,

            temp_max_c          Float32,
            temp_min_c          Float32,
            temp_avg_c          Float32,
            precip_mm           Float32,
            precip_category     String,

            author              String,
            team                String,
            source_database     String,
            source_data_version String,
            source_timestamp    String,
            warehouse_load_time String,
            etl_batch_id        String,
            record_source       String,
            sync_type           String,
            schema_version      String,
            stage               String
        )
        ENGINE = MergeTree()
        ORDER BY (date, city)
    """)


def migrate_enriched():
    # ----- connect to Mongo -----
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client[DB_NAME]
    coll = db[ENRICHED_COLL]

    # ----- connect to ClickHouse -----
    ch = CHClient(host=CH_HOST, port=CH_PORT)
    ensure_table(ch)

    # compute 90-day window (today + previous 89 days)
    start_date = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")

    cursor = coll.find({
        "metadata.team": "Team Black",
    })

    batch = []
    BATCH_SIZE = 1000
    total_inserted = 0

    for doc in cursor:
        loc  = doc.get("location", {}) or {}
        metr = doc.get("metrics", {}) or {}
        meta = doc.get("metadata", {}) or {}

        row = (
            doc.get("date", ""),                      # date as string

            str(loc.get("city", "")),
            str(loc.get("state", "")),
            float(loc.get("lat") or 0.0),
            float(loc.get("lon") or 0.0),

            float(metr.get("temp_max_c") or 0.0),
            float(metr.get("temp_min_c") or 0.0),
            float(metr.get("temp_avg_c") or 0.0),
            float(metr.get("precip_mm") or 0.0),
            str(metr.get("precip_category", "")),

            str(meta.get("author", "")),
            str(meta.get("team", "")),
            str(meta.get("source_database", "")),
            str(meta.get("source_data_version", "")),
            str(meta.get("source_timestamp", "")),
            str(meta.get("warehouse_load_time", "")),
            str(meta.get("etl_batch_id", "")),
            str(meta.get("record_source", "")),
            str(meta.get("sync_type", "")),
            str(meta.get("schema_version", "")),
            str(meta.get("stage", "")),
        )

        batch.append(row)

        if len(batch) >= BATCH_SIZE:
            ch.execute(
                f"""
                INSERT INTO {CH_DB}.{CH_TABLE} (
                    date,
                    city, state, lat, lon,
                    temp_max_c, temp_min_c, temp_avg_c,
                    precip_mm, precip_category,
                    author, team, source_database, source_data_version,
                    source_timestamp, warehouse_load_time, etl_batch_id,
                    record_source, sync_type, schema_version, stage
                ) VALUES
                """,
                batch,
            )
            total_inserted += len(batch)
            print(f"Inserted batch of {len(batch)} rows")
            batch = []

    # final batch
    if batch:
        ch.execute(
            f"""
            INSERT INTO {CH_DB}.{CH_TABLE} (
                date,
                city, state, lat, lon,
                temp_max_c, temp_min_c, temp_avg_c,
                precip_mm, precip_category,
                author, team, source_database, source_data_version,
                source_timestamp, warehouse_load_time, etl_batch_id,
                record_source, sync_type, schema_version, stage
            ) VALUES
            """,
            batch,
        )
        total_inserted += len(batch)
        print(f"Inserted final batch of {len(batch)} rows")

    print(f"Done migrating enriched_observations. Total rows inserted: {total_inserted}")

    # ----- run aggregation query for assignment -----
    result = ch.execute(f"""
        SELECT
            avg(temp_avg_c)  AS avg_temperature_c,
            avg(precip_mm)   AS avg_rainfall_mm
        FROM {CH_DB}.{CH_TABLE}
    """)
    print("\n=== Aggregation Result (for screenshot) ===")
    print("avg_temperature_c, avg_rainfall_mm")
    for row in result:
        print(row[0], row[1])


if __name__ == "__main__":
    migrate_enriched()