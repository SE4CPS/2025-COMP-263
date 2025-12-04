// dashboard_express.js
const express = require('express');
const Redis = require('ioredis');
const { ClickHouse } = require('clickhouse');
require('dotenv').config();

const PORT = Number(process.env.PORT || 3000);

// ===== Redis config =====
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_KEY = process.env.REDIS_KEY || 'stockton:daily_weather';
const REDIS_TTL_SECONDS = Number(process.env.REDIS_TTL_SECONDS || 600);

// ===== ClickHouse config =====
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost';
const CLICKHOUSE_PORT = Number(process.env.CLICKHOUSE_PORT || 8123);
const CLICKHOUSE_DB = process.env.CLICKHOUSE_DB || 'stockton_weather';
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || 'default';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || '';
const TABLE = process.env.CLICKHOUSE_TABLE || 'daily_weather';

// ===== Clients =====
const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD
});

const clickhouse = new ClickHouse({
    url: CLICKHOUSE_URL,
    port: CLICKHOUSE_PORT,
    basicAuth: {
        username: CLICKHOUSE_USER,
        password: CLICKHOUSE_PASSWORD
    },
    format: 'json',
    config: { database: CLICKHOUSE_DB }
});

const app = express();

// ---------- HTML DASHBOARD (with charts) ----------
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Stockton Weather Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      color: #222;
    }
    h1 {
      margin-bottom: 0.2rem;
    }
    .subtitle {
      margin-top: 0;
      color: #555;
      font-size: 0.9rem;
    }
    .meta {
      margin: 10px 0 20px;
      font-size: 0.9rem;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.8rem;
      border: 1px solid #ccc;
      background: #fff;
      margin-right: 8px;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    .charts {
      display: grid;
      grid-template-columns: 1fr;
      gap: 30px;
    }
    @media (min-width: 900px) {
      .charts {
        grid-template-columns: 2fr 1fr;
      }
    }
    .card {
      background: #fff;
      border-radius: 12px;
      padding: 16px 18px 22px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    }
    canvas {
      width: 100% !important;
      height: 320px !important;
    }
    details {
      margin-top: 20px;
    }
    pre {
      background: #111;
      color: #e6e6e6;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.8rem;
      max-height: 350px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Stockton Daily Weather</h1>
    <p class="subtitle">End-to-end pipeline: API → MongoDB → ClickHouse → Redis → Dashboard</p>

    <div class="meta">
      <span class="badge">Source: <span id="source-label">loading...</span></span>
      <span class="badge">Rows: <span id="row-count">0</span></span>
      <span class="badge">Redis TTL: <span id="redis-ttl">-</span></span>
    </div>

    <div class="charts">
      <div class="card">
        <h3>Temperature (°C)</h3>
        <canvas id="tempChart"></canvas>
      </div>
      <div class="card">
        <h3>Daily Precipitation (mm)</h3>
        <canvas id="precipChart"></canvas>
      </div>
    </div>

    <details>
      <summary>View raw JSON data (for debugging / grading)</summary>
      <pre id="raw-json">Loading...</pre>
    </details>
  </div>

  <script>
    async function loadData() {
      const res = await fetch('/api/daily');
      const data = await res.json();

      // Meta info
      document.getElementById('source-label').textContent = data.source || 'unknown';
      document.getElementById('row-count').textContent = data.rows ? data.rows.length : 0;
      document.getElementById('redis-ttl').textContent =
        data.redis_ttl_seconds !== undefined ? data.redis_ttl_seconds : '-';

      // Raw JSON
      document.getElementById('raw-json').textContent =
        JSON.stringify(data, null, 2);

      const rows = data.rows || [];
      if (!rows.length) return;

      // Prepare series
      const labels = rows.map(r => r.date);
      const maxTemps = rows.map(r => Number(r.max_temp_c));
      const minTemps = rows.map(r => Number(r.min_temp_c));
      const precip = rows.map(r => Number(r.precip_mm));

      // Temperature line chart
      const ctxTemp = document.getElementById('tempChart').getContext('2d');
      new Chart(ctxTemp, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Max Temp (°C)',
              data: maxTemps,
              tension: 0.2,
              borderWidth: 2,
              pointRadius: 0
            },
            {
              label: 'Min Temp (°C)',
              data: minTemps,
              tension: 0.2,
              borderWidth: 2,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                autoSkip: true,
                maxTicksLimit: 15
              }
            },
            y: {
              title: { display: true, text: '°C' }
            }
          }
        }
      });

      // Precipitation bar chart
      const ctxPrecip = document.getElementById('precipChart').getContext('2d');
      new Chart(ctxPrecip, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Precipitation (mm)',
              data: precip,
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                autoSkip: true,
                maxTicksLimit: 15
              }
            },
            y: {
              title: { display: true, text: 'mm' }
            }
          }
        }
      });
    }

    loadData().catch(err => {
      document.getElementById('raw-json').textContent =
        'Error loading /api/daily: ' + err;
    });
  </script>
</body>
</html>`);
});

// ---------- JSON API (unchanged behavior, used by dashboard) ----------
app.get('/api/daily', async (req, res) => {
    try {
        // 1) Try Redis cache
        const cached = await redis.get(REDIS_KEY);
        if (cached) {
            const ttl = await redis.ttl(REDIS_KEY);
            return res.json({
                source: 'redis',
                redis_ttl_seconds: ttl,
                rows: JSON.parse(cached)
            });
        }

        // 2) Fallback to ClickHouse
        const query = `
            SELECT date, max_temp_c, min_temp_c, precip_mm
            FROM ${TABLE}
            ORDER BY date
        `;
        const result = await clickhouse.query(query).toPromise();
        const rows = result.data || result;

        // 3) Populate cache
        await redis.set(REDIS_KEY, JSON.stringify(rows), 'EX', REDIS_TTL_SECONDS);

        return res.json({
            source: 'clickhouse',
            redis_ttl_seconds: REDIS_TTL_SECONDS,
            rows
        });
    } catch (err) {
        console.error('Error in /api/daily:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: String(err.message || err)
        });
    }
});

app.listen(PORT, () => {
    console.log(`Dashboard listening at http://localhost:${PORT}`);
});
