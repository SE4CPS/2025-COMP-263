// client/sync-indexeddb.js
(() => {
    const DB_NAME = 'AgriDB';
    const STORE = 'readings';
    let db;

    const utcNow = () => new Date().toISOString();

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, { keyPath: 'sensorId' });
                    store.createIndex('sensorId', 'sensorId', { unique: true });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function getAll() {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const store = tx.objectStore(STORE);
            const r = store.getAll();
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        });
    }

    const putAllWithReduce = (items) =>
        new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            items.reduce((p, item) =>
                    p.then(() => new Promise((res, rej) => {
                        const r = store.put(item);
                        r.onsuccess = () => res();
                        r.onerror = () => rej(r.error);
                    }))
                , Promise.resolve())
                .then(() => tx.commit?.())
                .then(resolve)
                .catch(reject);
        });

    async function initDB() {
        db = await openDB();
    }

    // Seed exactly 10 docs using map/filter/reduce (no loops)
    async function seedTen() {
        if (!db) db = await openDB();
        const ids = Array.from({ length: 10 }, (_, i) => i + 1);
        const docs = ids
            .map(id => ({
                sensorId: id,
                reading: Number((Math.random() * 100).toFixed(2)),
                timestamp: utcNow(),
                notes: `Auto-generated sample #${id}`
            }))
            .filter(d => d.reading >= 0);
        await putAllWithReduce(docs);
    }

    // Build preview payload: first 10 + metadata (students: set your real name)
    async function buildPreviewPayload() {
        if (!db) db = await openDB();
        const all = await getAll();
        const first10 = all.slice(0, 10);
        if (first10.length !== 10) throw new Error('Need at least 10 objects saved.');

        // ✅ Set the real name once
        const author = 'Darshana Patil'; // <-- put the student’s real name here
        const metadata = {
            author,
            last_sync: utcNow()
        };

        // example "reduce": mean reading
        const avg = first10
            .map(x => Number(x.reading) || 0)
            .reduce((sum, x, _, arr) => sum + x / arr.length, 0);

        // ✅ Add author into each reading
        const docs = first10.map(d => ({
            ...d,
            author,
            avgReadingComputed: avg
        }));

        return { metadata, docs };
    }


    // Expose API to window
    window.lab2 = { initDB, seedTen, buildPreviewPayload };
})();
