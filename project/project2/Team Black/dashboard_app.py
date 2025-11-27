from flask import Flask, jsonify, render_template
import redis
from clickhouse_driver import Client as CHClient
from datetime import datetime

app = Flask(__name__)

# ------------ CONFIG ------------
REDIS_HOST = "localhost"
REDIS_PORT = 6379
REDIS_DB   = 0

CH_HOST = "localhost"
CH_DB   = "Project2"   # ClickHouse DB
CH_TABLE = "enriched_observations"

# ------------ CLIENTS ------------
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB)


# ------------ API: SUMMARY METRICS ------------
@app.get("/api/weather-metrics")
def get_weather_metrics():
    """
    Returns overall averages for temp & rainfall.
    Prefer Redis cache; fallback to ClickHouse.
    """
    avg_temp = r.get("weather:avg_temperature_c")
    avg_rain = r.get("weather:avg_rainfall_mm")
    last_updated = r.get("weather:last_updated")

    if avg_temp and avg_rain:
        return jsonify({
            "source": "redis",
            "avg_temperature_c": float(avg_temp),
            "avg_rainfall_mm": float(avg_rain),
            "last_updated": last_updated.decode("utf-8") if last_updated else None,
        })

    # Cache miss → query ClickHouse
    ch = CHClient(host=CH_HOST, database=CH_DB)
    row = ch.execute(f"""
        SELECT
            avg(temp_avg_c)  AS avg_temperature_c,
            avg(precip_mm)   AS avg_rainfall_mm
        FROM {CH_TABLE}
    """)[0]
    ch.disconnect()

    avg_temperature_c, avg_rainfall_mm = row
    now_iso = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    # Repopulate Redis
    TTL_SECONDS = 3600
    r.set("weather:avg_temperature_c", avg_temperature_c, ex=TTL_SECONDS)
    r.set("weather:avg_rainfall_mm", avg_rainfall_mm, ex=TTL_SECONDS)
    r.set("weather:last_updated", now_iso, ex=TTL_SECONDS)

    return jsonify({
        "source": "clickhouse",
        "avg_temperature_c": avg_temperature_c,
        "avg_rainfall_mm": avg_rainfall_mm,
        "last_updated": now_iso,
    })


# ------------ API: DAILY TRENDS (FOR 90-DAY CHART) ------------

@app.get("/api/trends")
def get_trends():
    ch = CHClient(host=CH_HOST, database=CH_DB)
    rows = ch.execute("""
        SELECT
            date,
            avg(temp_avg_c)  AS avg_temperature_c,
            avg(precip_mm)   AS avg_rainfall_mm
        FROM enriched_observations
        GROUP BY date
        ORDER BY date
    """)
    ch.disconnect()

    formatted = [
        {
            "date": row[0],
            "avg_temperature_c": row[1],
            "avg_rainfall_mm": row[2]
        }
        for row in rows
    ]

    return jsonify({"data": formatted})

@app.post("/api/sync")
def sync_data():
    import subprocess
    
    # Clean Redis cache
    r.flushdb()

    # Call Open-Meteo → MongoDB
    subprocess.run(["python3", "api.py"])

    # MongoDB → ClickHouse
    subprocess.run(["python3", "mongo_to_clickhouse_enriched.py"])

    return jsonify({"message": "Sync completed successfully."})

# ------------ DASHBOARD PAGE ------------
@app.get("/")
def index():
    """
    Main dashboard page. Renders templates/index.html
    """
    return render_template("index.html")


# ------------ MAIN ------------
if __name__ == "__main__":
    # Make sure ClickHouse & Redis are running first
    app.run(debug=True, use_reloader=False)