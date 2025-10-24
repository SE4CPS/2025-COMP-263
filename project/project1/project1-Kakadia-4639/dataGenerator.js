function random(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(2);
}

const readings = Array.from({ length: 50 }, (_, i) => ({
  deviceId: `sensor-${String(i + 1).padStart(3, "0")}`,
  farmId: `farm-${String((i % 10) + 1).padStart(2, "0")}`,
  sensor: {
    tempC: random(15, 35),
    moisture: random(20, 60),
    humidity: random(40, 80),
  },
  gps: {
    lat: random(-90, 90),
    lon: random(-180, 180),
  },
  note: "Automated sample reading",
  timestamp: new Date(Date.now() - Math.random() * 1e8).toISOString(),
  ingestedAt: new Date().toISOString(),
  metadata: {
    author: 'Ravi Pareshbhai Kakadia'
  }
}));

console.log(readings)


readings.map((reading, idx) => {
    fetch("http://localhost:3000/readings", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(reading)
    }).then(response => response.json())
    .then(data => console.log(`Success_${idx}: `, data))
    .catch(error => console.error(`Error_${idx}: ${error}`))
})


