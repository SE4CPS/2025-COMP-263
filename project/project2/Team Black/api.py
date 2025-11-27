# api.py
"""
Fetch 90-day daily weather history from Open-Meteo
and load it into MongoDB Project2.enriched_observations
(one document per calendar day).

This matches the schema expected by mongo_to_clickhouse_enriched.py
(metrics.temp_max_c, temp_min_c, temp_avg_c, precip_mm, precip_category).
"""

import requests
from datetime import datetime, timezone
from uuid import uuid4

from pymongo import MongoClient

# ---------- CONFIG ----------

MONGO_URI = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/"
DB_NAME = "Project2"
ENRICHED_COLL = "enriched_observations"

AUTHOR = "Farheen, Cheng Han Chung, Yu-Tai"
TEAM_NAME = "Team Black"

STOCKTON_LAT = 37.9577
STOCKTON_LON = -121.2908

SOURCE_DATABASE = "Open-Meteo API"
SOURCE_DATA_VERSION = "openmeteo_v1"
LICENSE = "Open-Meteo Free Use"
SCHEMA_VERSION = "v1.0"


def utc_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def precip_category(mm: float) -> str:
    """Simple label for rainfall intensity."""
    if mm is None:
        return "unknown"
    if mm == 0:
        return "dry"
    if mm < 2:
        return "light"
    if mm < 10:
        return "moderate"
    return "heavy"


def fetch_90day_daily():
    """Call Open-Meteo daily endpoint with past_days=90."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": STOCKTON_LAT,
        "longitude": STOCKTON_LON,
        "forecast_days": 0,  # we only care about history
        "past_days": 90,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "timezone": "auto",
    }

    print("Requesting 90-day daily history from Open-Meteo...")
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    return data


def build_enriched_docs(daily_payload: dict):
    """Convert Open-Meteo daily arrays into Mongo documents."""
    now_iso = utc_iso()
    etl_batch_id = f"openmeteo-90day-{uuid4().hex[:8]}"

    daily = daily_payload.get("daily", {})
    dates = daily.get("time", [])
    tmax = daily.get("temperature_2m_max", [])
    tmin = daily.get("temperature_2m_min", [])
    precip = daily.get("precipitation_sum", [])

    docs = []

    for i, date_str in enumerate(dates):
        max_c = tmax[i] if i < len(tmax) else None
        min_c = tmin[i] if i < len(tmin) else None
        precip_mm = precip[i] if i < len(precip) else None

        # avg temperature if both max and min exist
        if max_c is not None and min_c is not None:
            avg_c = (max_c + min_c) / 2.0
        else:
            avg_c = None

        doc = {
            "date": date_str,
            "location": {
                "city": "Stockton",
                "state": "CA",
                "lat": STOCKTON_LAT,
                "lon": STOCKTON_LON,
            },
            "metrics": {
                "temp_max_c": max_c,
                "temp_min_c": min_c,
                "temp_avg_c": avg_c,
                "precip_mm": precip_mm,
                "precip_category": precip_category(precip_mm),
            },
            "metadata": {
                "author": AUTHOR,
                "team": TEAM_NAME,
                "source_database": SOURCE_DATABASE,
                "source_data_version": SOURCE_DATA_VERSION,
                "source_timestamp": now_iso,
                "warehouse_load_time": now_iso,
                "etl_batch_id": etl_batch_id,
                "record_source": "open_meteo_historical",
                "sync_type": "full",              # full 90-day refresh
                "schema_version": SCHEMA_VERSION,
                "stage": "daily_enriched",
                "license": LICENSE,
            },
        }

        docs.append(doc)

    return docs


def load_to_mongo(docs):
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    coll = db[ENRICHED_COLL]

    # optional: clear previous Team Black history so we truly have 90 days
    result_del = coll.delete_many({"metadata.team": TEAM_NAME})
    print(f"Deleted {result_del.deleted_count} old Team Black docs from enriched_observations.")

    if docs:
        result = coll.insert_many(docs)
        print(f"Inserted {len(result.inserted_ids)} new enriched docs.")
    else:
        print("No docs to insert!")

if __name__ == "__main__":
    payload = fetch_90day_daily()
    docs = build_enriched_docs(payload)
    print(f"Built {len(docs)} daily documents.")
    load_to_mongo(docs)
    print("Done loading 90-day history into MongoDB Project2.enriched_observations.")