# api.py
# Fetches real-time + historical 12-month weather for Stockton using Open-Meteo

import requests
from datetime import datetime, timedelta

STOCKTON_LAT = 37.9577
STOCKTON_LON = -121.2908

def fetch_realtime():
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": STOCKTON_LAT,
        "longitude": STOCKTON_LON,
        "current_weather": "true",
        "hourly": "relativehumidity_2m,shortwave_radiation",
        "timezone": "auto"
    }
    return requests.get(url, params=params).json()

def fetch_historical():
    url = "https://api.open-meteo.com/v1/archive"

    end_date = datetime.utcnow() - timedelta(days=5)
    start_date = end_date - timedelta(days=365)

    params = {
        "latitude": STOCKTON_LAT,
        "longitude": STOCKTON_LON,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "timezone": "auto"
    }
    return requests.get(url, params=params).json()

if __name__ == "__main__":
    print("=== Real-time weather ===")
    print(fetch_realtime())

    print("\n=== Historical (last 12 months) ===")
    print(fetch_historical())
