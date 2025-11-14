#!/bin/bash
# Stockton Weather Queries using Open-Meteo (no API key required)

echo "=== Real-time weather (forecast API) ==="
curl -G "https://api.open-meteo.com/v1/forecast" \
  --data-urlencode "latitude=37.9577" \
  --data-urlencode "longitude=-121.2908" \
  --data-urlencode "current_weather=true" \
  --data-urlencode "hourly=relativehumidity_2m,shortwave_radiation" \
  --data-urlencode "timezone=auto"

echo ""
echo "=== Historical weather (last ~12 months) ==="

START_DATE="2024-11-14"
END_DATE="2025-11-09"

curl -G "https://api.open-meteo.com/v1/archive" \
  --data-urlencode "latitude=37.9577" \
  --data-urlencode "longitude=-121.2908" \
  --data-urlencode "start_date=$START_DATE" \
  --data-urlencode "end_date=$END_DATE" \
  --data-urlencode "daily=temperature_2m_max,temperature_2m_min,precipitation_sum" \
  --data-urlencode "timezone=auto"
