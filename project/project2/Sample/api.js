// api.js
// Sample code for COMP 263 Project 2
// Fetches real-time weather + last ~12 months of historical weather
// for Stockton, CA using the Open-Meteo API (no API key required).

const axios = require("axios");

// Stockton, CA approximate coordinates
const STOCKTON_LAT = 37.9577;
const STOCKTON_LON = -121.2908;

// Helper: format Date → "YYYY-MM-DD"
function formatDate(d) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchRealTimeWeather() {
  const url = "https://api.open-meteo.com/v1/forecast";

  const params = {
    latitude: STOCKTON_LAT,
    longitude: STOCKTON_LON,
    current_weather: true,
    hourly: "relativehumidity_2m,shortwave_radiation",
    timezone: "auto"
  };

  const response = await axios.get(url, { params });
  return response.data;
}

async function fetchHistoricalWeatherLast12Months() {
  const url = "https://api.open-meteo.com/v1/archive";

  // Open-Meteo historical data has a small delay (a few days),
  // so we end a few days before "today".
  const today = new Date();
  const endDate = new Date(today);
  endDate.setUTCDate(endDate.getUTCDate() - 5); // avoid last ~5 days

  const startDate = new Date(endDate);
  startDate.setUTCFullYear(startDate.getUTCFullYear() - 1); // ~12 months back

  const params = {
    latitude: STOCKTON_LAT,
    longitude: STOCKTON_LON,
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    // Daily variables relevant for rainfall + temperature analytics
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "auto"
  };

  const response = await axios.get(url, { params });
  return response.data;
}

async function main() {
  try {
    console.log("=== Real-time weather for Stockton (Open-Meteo) ===");
    const realTime = await fetchRealTimeWeather();
    console.log(JSON.stringify(realTime, null, 2));

    console.log("\n=== Historical weather for Stockton (last ~12 months) ===");
    const historical = await fetchHistoricalWeatherLast12Months();
    console.log(JSON.stringify(historical, null, 2));

    // This script can be extended later to:
    // - Add metadata fields (source_timestamp, api_request_id, etl_batch_id, etc.)
    // - Write the JSON data into MongoDB, ClickHouse, Redis, and Dashboard layers.
  } catch (err) {
    console.error("Error fetching weather data:", err.message || err);
  }
}

main();
