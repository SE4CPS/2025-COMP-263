const DB_NAME = "AgricultureDB";
const STORE = "FarmData";
const DB_VERSION = 1;
const logEl = document.getElementById("log");

const ui = {
  initBtn: document.getElementById("initBtn"),
  seedBtn: document.getElementById("seedBtn"),
  countBtn: document.getElementById("countBtn"),
  testsBtn: document.getElementById("testsBtn"),
};
const log = (msg, cls = "") =>
  (logEl.innerHTML += `\n${cls ? `<span class="${cls}">` : ""}${msg}${
    cls ? "</span>" : ""
  }`);

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        fn(store);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

const LOCAL_PHOTOS = [
  "images/corn.webp",
  "images/wheat.jpg",
  "images/tomato.webp",
  "images/potato.webp",
];

const DATA_URL_FALLBACK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwsB9Qx7wLQAAAAASUVORK5CYII=";

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randFloat = (a, b, d = 2) => +(a + Math.random() * (b - a)).toFixed(d);

function makeRecord() {
  const readings = Array.from({ length: rand(3, 8) }, () =>
    randFloat(0, 100, 2)
  );
  const chosen = LOCAL_PHOTOS[rand(0, LOCAL_PHOTOS.length - 1)];
  const cropPhoto = chosen || DATA_URL_FALLBACK;
  const notes = [
    "Irrigated field; leaves look healthy.",
    "Mild pest signs; applied organic spray.",
    "Soil moisture low near east boundary.",
    "Great sunlight; slight yellowing at edges.",
    "Added fertilizer NPK 10-10-10.",
  ];
  return {
    sensorReadings: readings,
    cropPhoto,
    farmerNote: notes[rand(0, notes.length - 1)],
    gpsCoordinates: randFloat(-90, 90, 6),
    timestamp: new Date(Date.now() - rand(0, 30) * 24 * 60 * 60 * 1000),
  };
}

async function addRandomRecords(total = 10000) {
  const BATCH = 500;
  let inserted = 0;

  const db = await openDB();
  log(`Opened DB "${DB_NAME}".`, "ok");

  while (inserted < total) {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (let i = 0; i < Math.min(BATCH, total - inserted); i++) {
      store.add(makeRecord());
    }
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
    inserted += Math.min(BATCH, total - inserted);
    log(`Inserted ${inserted}/${total}…`);
    await new Promise((r) => setTimeout(r, 0));
  }

  db.close();
  log(`Done inserting ${total} records.`, "ok");
}

async function getSampleAndCount(limit = 5) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const sampleReq = store.getAll(undefined, limit);
  const countReq = store.count();

  const result = await new Promise((resolve, reject) => {
    const out = {};
    sampleReq.onsuccess = () => {
      out.sample = sampleReq.result;
    };
    countReq.onsuccess = () => {
      out.count = countReq.result;
    };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  db.close();
  return result;
}

ui.initBtn.onclick = async () => {
  try {
    await openDB().then((db) => db.close());
    log("Database initialized / opened.", "ok");
    ui.seedBtn.disabled = false;
  } catch (e) {
    log(`Init error: ${e}`, "err");
  }
};

ui.seedBtn.onclick = async () => {
  ui.seedBtn.disabled = true;
  try {
    await addRandomRecords(10000);
    ui.countBtn.disabled = false;
    ui.testsBtn.disabled = false;
    log(
      "Open DevTools → Application → IndexedDB to screenshot the store.",
      "warn"
    );
  } catch (e) {
    log(`Insert error: ${e}`, "err");
    ui.seedBtn.disabled = false;
  }
};

ui.countBtn.onclick = async () => {
  try {
    const { sample, count } = await getSampleAndCount(6);
    console.log("Sample records (first few):", sample);
    console.table(
      sample.map((r) => ({
        id: r.id,
        readings: r.sensorReadings.length,
        photo: (r.cropPhoto || "").slice(0, 40) + "…",
        note: r.farmerNote,
        gps: r.gpsCoordinates,
        ts:
          r.timestamp instanceof Date
            ? r.timestamp.toISOString()
            : String(r.timestamp),
      }))
    );
    log(`Total rows in ${STORE}: ${count}`, "ok");
  } catch (e) {
    log(`Read error: ${e}`, "err");
  }
};

ui.testsBtn.onclick = () => window.runAllTests?.();
