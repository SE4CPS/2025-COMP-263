let tempChart;
let rainChart;

function buildCharts(data) {
  const tempCanvas = document.getElementById("tempChart");
  const rainCanvas = document.getElementById("rainChart");

  const labels = data.monthly_stats.map((x) => x.month);
  const max = data.monthly_stats.map((x) => x.avg_temp_max_c);
  const min = data.monthly_stats.map((x) => x.avg_temp_min_c);
  const rain = data.monthly_stats.map((x) => x.total_precipitation_mm);

  if (tempChart) tempChart.destroy();
  if (rainChart) rainChart.destroy();

  tempChart = new Chart(tempCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Max Temp", data: max },
        { label: "Min Temp", data: min },
      ],
    },
  });

  rainChart = new Chart(rainCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Rainfall", data: rain }],
    },
  });
}

async function loadSummary() {
  const res = await fetch("/api/weather-summary");
  const data = await res.json();

  const syncEl = document.getElementById("syncIndicator");
  const genEl = document.getElementById("generatedAt");
  const intervalEl = document.getElementById("refreshInterval");

  syncEl.textContent = data.sync_indicator || "unknown";
  genEl.textContent = data.generated_at_utc || "-";
  intervalEl.textContent = data.refresh_interval_sec
    ? data.refresh_interval_sec / 60 + " min"
    : "-";

  if (data.monthly_stats && data.monthly_stats.length > 0) {
    buildCharts(data);
  }
}

async function runSync() {
  const btn = document.getElementById("syncBtn");
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "Syncing...";
  try {
    await fetch("/api/sync-now", { method: "POST" });
    await loadSummary();
  } finally {
    btn.disabled = false;
    btn.textContent = "Sync Now";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("syncBtn");
  if (btn) {
    btn.addEventListener("click", runSync);
  }
  loadSummary();
});
