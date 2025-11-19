// ---- CONFIG ----
const DB_NAME = 'Agriculture';
const STORE_NAME = 'readings';

// Helper: open IndexedDB
function openDB(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

// Helper: read ALL from a store
function getAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result || []);
  });
}

// Convert any date-ish field to strict UTC ISO-8601
const toUTC = v => new Date(v).toISOString();

// MAIN: pull first 10, normalize, and send
async function syncFirst10ToServer() {
  try {
    const db = await openDB(DB_NAME);
    const all = await getAll(db, STORE_NAME);

    // Keep exactly first 10 – NO loops
    const first10 = all.slice(0, 10).map((doc, i) => ({
      ...doc,
      sensorId: doc.sensorId ?? (i + 1),
      timestamp: toUTC(doc.timestamp ?? Date.now()),
      notes: String(doc.notes ?? 'ok')
    }));

    if (first10.length !== 10) {
      alert('You must have at least 10 objects in IndexedDB.');
      return;
    }

    // Metadata
    const metadata = {
      author: 'Deepika Jakati',
      last_sync: toUTC(Date.now()),
      _type: 'metadata'
    };

    // Compute average reading using map + reduce
    const avgReading = first10
      .map(x => Number(x.reading) || 0)
      .reduce((sum, x, _, arr) => sum + x / arr.length, 0);

    const payload = {
      docs: first10.map(d => ({ ...d, avgReadingComputed: avgReading })),
      metadata
    };

    // Send to Node.js server
    const res = await fetch('http://localhost:3000/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error('Server error: ' + text);
    }

    alert('Synced 10 docs + metadata to MongoDB!');
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  }
}

// Attach to button
document.getElementById('syncBtn').addEventListener('click', syncFirst10ToServer);

// Expose globally (for inline onclick if needed)
window.syncFirst10ToServer = syncFirst10ToServer;
console.log("syncFirst10ToServer:" , syncFirst10ToServer)
