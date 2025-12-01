import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function WeatherDashboard() {
  const [data, setData] = useState([]);
  const [syncStatus, setSyncStatus] = useState("Checking...");

  async function loadWeather() {
    try {
      const res = await fetch("http://localhost:4000/api/weather");
      if (!res.ok) throw new Error("Network response was not ok");

      const json = await res.json();

      const normalizedData = json.map((item) => ({
        date: item.date || "",
        temp_high: item.temp_high ?? null,
        temp_low: item.temp_low ?? null,
        total_rain: item.total_rain ?? null,
        peak_humidity: item.peak_humidity ?? null,
        soil_moisture: item.soil_moisture ?? null,
      }));

      setData(normalizedData);

      let missingFields = normalizedData.some(
        (row) =>
          row.temp_high === null ||
          row.temp_low === null ||
          row.total_rain === null ||
          row.peak_humidity === null ||
          row.soil_moisture === null
      );

      if (!missingFields) setSyncStatus("FULL SYNC");
      else if (normalizedData.length > 0) setSyncStatus("PARTIAL SYNC");
      else setSyncStatus("OUT OF SYNC");
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
      setSyncStatus("OUT OF SYNC");
    }
  }

  useEffect(() => {
    loadWeather();
  }, []);

  if (!data.length)
    return (
      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "20px",
          textAlign: "center",
          marginTop: "50px",
        }}
      >
        Loading weather data...
      </p>
    );

  const containerStyle = {
    width: "98vw",
    height: "96vh",
    padding: "20px",
    background: "linear-gradient(135deg, #dde8f0, #e8eef5)",
    fontFamily: "'Inter', sans-serif",
    overflow: "hidden",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  };

  const titleStyle = {
    fontSize: "36px",
    fontWeight: "bold",
    color: "#1d3557",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const syncIndicatorStyle = {
    padding: "10px 18px",
    borderRadius: "10px",
    fontWeight: "bold",
    color: "white",
    background:
      syncStatus === "FULL SYNC"
        ? "#2ecc71"
        : syncStatus === "PARTIAL SYNC"
        ? "#f39c12"
        : "#e74c3c",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "25px",
    height: "calc(100% - 80px)",
  };

  const cardStyle = {
    background: "white",
    padding: "20px",
    borderRadius: "18px",
    boxShadow: "0 4px 25px rgba(0,0,0,0.12)",
    transition: "0.3s",
  };

  const cardHoverStyle = {
    transform: "scale(1.02)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.18)",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>🌤 Stockton Weather Dashboard</h1>

        <div style={syncIndicatorStyle}>{syncStatus}</div>
      </div>

      <div style={gridStyle}>
        <div
          style={cardStyle}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, cardHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, cardStyle)}
        >
          <h2 style={{ color: "#e63946", marginBottom: "10px" }}>Temperature High & Low</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="temp_high" stroke="#e63946" strokeWidth={2} />
              <Line type="monotone" dataKey="temp_low" stroke="#457b9d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={cardStyle}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, cardHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, cardStyle)}
        >
          <h2 style={{ color: "#2a9d8f", marginBottom: "10px" }}>Total Rainfall</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total_rain" stroke="#2a9d8f" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={cardStyle}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, cardHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, cardStyle)}
        >
          <h2 style={{ color: "#8e44ad", marginBottom: "10px" }}>Peak Humidity</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="peak_humidity" stroke="#8e44ad" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={cardStyle}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, cardHoverStyle)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, cardStyle)}
        >
          <h2 style={{ color: "#d35400", marginBottom: "10px" }}>Soil Moisture</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="soil_moisture" stroke="#d35400" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
