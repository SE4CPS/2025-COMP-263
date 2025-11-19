const DB_NAME = "AgricultureDB";
const STORE = "FarmData";
const VERSION = 1;

const DATA_URL_IMAGE =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFugJx3y2wNwAAAABJRU5ErkJggg==";

const req = indexedDB.open(DB_NAME, VERSION);

req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    }
};

req.onsuccess = async (e) => {
    const db = e.target.result;
    console.log("Seeding 10,000…");
    await seed(db, 10000);
    const total = await count(db);
    console.log("Done. Count =", total);
};

req.onerror = (e) => console.error("open error:", e.target.error);

function gen() {
    return {
        sensorReadings: Array.from({ length: 5 }, () => +(Math.random() * 100).toFixed(2)),
        cropPhoto: DATA_URL_IMAGE,
        farmerNote: "Note #" + Math.floor(Math.random() * 100000),
        gpsCoordinates: +(Math.random() * 180 - 90).toFixed(6),
        timestamp: new Date()
    };
}

function seed(db, total) {
    const BATCH = 500;
    let inserted = 0;
    return new Promise(async (resolve, reject) => {
        async function loop() {
            if (inserted >= total) return resolve();
            const n = Math.min(BATCH, total - inserted);
            const tx = db.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            for (let i = 0; i < n; i++) store.add(gen());
            tx.oncomplete = () => { inserted += n; loop(); };
            tx.onerror = () => reject(tx.error);
        }
        loop();
    });
}

function count(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const c = store.count();
        c.onsuccess = () => resolve(c.result);
        c.onerror = () => reject(c.error);
    });
}