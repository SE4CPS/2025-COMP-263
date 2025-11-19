/* ========= IndexedDB Setup ========= */
let db;
const DB_NAME = "AgricultureDB";
const STORE_NAME = "FarmData";
const IMG_FILES = [
  "Crop1.jpg","Crop2.jpg","Crop3.jpg","Crop4.jpg",
  "Crop5.jpg","Crop6.jpg","Crop7.jpg","Crop8.jpg","Crop9.jpg","Crop10.jpg"
];

window.addEventListener("DOMContentLoaded", () => {
  const request = indexedDB.open(DB_NAME, 1);

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    console.log("Database opened successfully");

    document.getElementById("insertBtn")?.addEventListener("click", insertData);
    document.getElementById("displayBtn")?.addEventListener("click", displayData);
    document.getElementById("resetBtn")?.addEventListener("click", () => { void resetDb(); });
  };

  request.onerror = (event) => {
    console.error("Database error:", event.target.error);
  };
});

/* ========= Utilities ========= */
function makeRandomEntry(i) {
  return {
    sensorReadings: Array.from({ length: 5 }, () => Number((Math.random() * 100).toFixed(2))),
    cropPhoto: "images/" + IMG_FILES[i % IMG_FILES.length],
    farmerNote: `Note ${i + 1}`,
    gpsCoordinates: {
      lat: Number((Math.random() * 180 - 90).toFixed(6)),
      lon: Number((Math.random() * 360 - 180).toFixed(6))
    },
    timestamp: new Date().toISOString()
  };
}

/* ========= Actions ========= */
async function insertData() {
  if (!db) return console.error("DB not open yet");

  // Check how many we already have
  const checkTx = db.transaction(STORE_NAME, "readonly");
  checkTx.objectStore(STORE_NAME).count().onsuccess = async (e) => {
    let remaining = 10000 - e.target.result;
    if (remaining <= 0) return alert("Already have ≥ 10,000 rows. Skip insert.");

    const BATCH = 1000; // keep UI responsive
    while (remaining > 0) {
      const n = Math.min(BATCH, remaining);
      await new Promise((res, rej) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        for (let i = 0; i < n; i++) store.add(makeRandomEntry(i));
        tx.oncomplete = res;
        tx.onerror = (ev) => rej(ev.target.error);
        tx.onabort  = (ev) => rej(ev.target.error);
      });
      remaining -= n;
      console.log(`Inserted batch. Remaining: ${remaining}`);
      await new Promise(r => setTimeout(r, 0)); // yield to UI
    }
    alert("Inserted 10,000 entries into IndexedDB!");
  };
}

function displayData() {
  if (!db) return console.error("DB not open yet");

  const output = document.getElementById("output");
  if (output) output.innerHTML = "";

  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  const req = store.openCursor();
  let shown = 0;

  req.onsuccess = (event) => {
    const cursor = event.target.result;
    if (!cursor || shown >= 10) return;
    const d = cursor.value;

    const card = document.createElement("div");
    card.className = "entry";
    card.innerHTML = `
      <p><b>ID:</b> ${d.id}</p>
      <p><b>Sensor Readings:</b> ${d.sensorReadings.join(", ")}</p>
      <p><b>Farmer Note:</b> ${d.farmerNote}</p>
      <p><b>GPS:</b> ${d.gpsCoordinates.lat}, ${d.gpsCoordinates.lon}</p>
      <p class="muted"><b>Timestamp:</b> ${d.timestamp}</p>
      <img src="${d.cropPhoto}" alt="Crop Photo"
           onerror="this.onerror=null;this.src='images/placeholder.jpg'"/>
    `;
    output?.appendChild(card);

    shown++;
    cursor.continue();
  };

  req.onerror = (e) => console.error("Cursor error:", e.target.error);
}

async function resetDb() {
  if (db) db.close();
  db = undefined;
  return new Promise((resolve) => {
    const del = indexedDB.deleteDatabase(DB_NAME);
    del.onsuccess = () => { console.log("Database deleted. Reload the page to recreate it."); resolve(); };
    del.onerror = (e) => { console.error("Delete error:", e.target.error); resolve(); };
  });
}