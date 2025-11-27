from clickhouse_driver import Client as CHClient
import redis
from datetime import datetime

# ---- CONFIG ----
CH_HOST = "localhost"
CH_DB = "Project2"

REDIS_HOST = "localhost"
REDIS_PORT = 6379
TTL_SECONDS = 3600


# Connect clients
ch = CHClient(host=CH_HOST, database=CH_DB)
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

# Run aggregation query
result = ch.execute("""
    SELECT
        avg(temp_avg_c) AS avg_temperature_c,
        avg(precip_mm) AS avg_rainfall_mm
    FROM enriched_observations
""")[0]

avg_temp, avg_rain = result
timestamp = datetime.utcnow().isoformat() + "Z"

# Store in Redis
r.set("weather:avg_temperature_c", avg_temp, ex=TTL_SECONDS)
r.set("weather:avg_rainfall_mm", avg_rain, ex=TTL_SECONDS)
r.set("weather:last_updated", timestamp, ex=TTL_SECONDS)

print("Cached successfully:")
print("avg_temperature_c:", avg_temp)
print("avg_rainfall_mm:", avg_rain)
print("TTL (sec):", TTL_SECONDS)