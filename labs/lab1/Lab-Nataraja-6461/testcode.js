(async () => {
    /* =========================
       IndexedDB helpers
    ==========================*/
    const DB_NAME = 'AgricultureDB';
    const STORE = 'FarmData';
    const DB_VERSION = 1;
    const TARGET_COUNT = 10000;
    const BATCH_SIZE = 500; // keep the UI responsive and avoid long transactions
    const CLEAR_BEFORE_INSERT = true; // set false to append instead of replacing
  
    function openDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (event) => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            // Useful indexes if you want to query later
            os.createIndex('timestamp_idx', 'timestamp');
            os.createIndex('photo_ext_idx', 'cropPhoto');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
  
    function withStore(db, mode, fn) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const p = fn(store);
        tx.oncomplete = () => resolve(p);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });
    }
  
    const rand = (min, max) => Math.random() * (max - min) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
    // NOTE: Requirement says gpsCoordinates should be a Number; we’ll store a single coordinate (latitude)
    function makeRecord(i) {
      const sensorReadings = Array.from({ length: 5 }, () => Number(rand(0, 100).toFixed(2))); // Array<number>
      const photoExt = pick(['.png', '.jpg', '.jpeg']);
      const cropPhoto = `./photos/crop_${(i % 20) + 1}${photoExt}`; // "local" URL string (no fetch needed)
      const farmerNote = pick([
        'Irrigation done',
        'Fertilizer applied',
        'Pests observed',
        'Healthy growth',
        'Soil looks dry',
        'Weeding completed',
        'Shade cloth adjusted'
      ]) + ` (#${i})`;
      const gpsCoordinates = Number(rand(-90, 90).toFixed(6)); // Number (latitude)
      const daysAgo = Math.floor(rand(0, 365));
      const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000); // Date
  
      return { sensorReadings, cropPhoto, farmerNote, gpsCoordinates, timestamp };
    }
  
    async function clearStore(db) {
      await withStore(db, 'readwrite', (store) => store.clear());
    }
  
    async function addMany(db, total) {
      const start = performance.now();
      let inserted = 0;
      for (let offset = 0; offset < total; offset += BATCH_SIZE) {
        const upper = Math.min(offset + BATCH_SIZE, total);
        await withStore(db, 'readwrite', (store) => {
          for (let i = offset; i < upper; i++) {
            store.add(makeRecord(i));
          }
        });
        inserted += (upper - offset);
        // Allow UI to breathe
        await new Promise(r => setTimeout(r, 0));
        if (inserted % 1000 === 0) {
          console.log(`Inserted ${inserted}/${total}…`);
        }
      }
      const ms = (performance.now() - start).toFixed(0);
      console.log(`✅ Inserted ${inserted} records in ~${ms} ms`);
    }
  
    async function countAll(db) {
      return withStore(db, 'readonly', (store) => {
        return new Promise((resolve, reject) => {
          const req = store.count();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      });
    }
  
    async function getFirstN(db, n = 5) {
      return withStore(db, 'readonly', (store) => {
        return new Promise((resolve, reject) => {
          const results = [];
          const req = store.openCursor();
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor && results.length < n) {
              results.push(cursor.value);
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          req.onerror = () => reject(req.error);
        });
      });
    }
  
    async function getByKey(db, id) {
      return withStore(db, 'readonly', (store) => {
        return new Promise((resolve, reject) => {
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      });
    }
  
    function formatRecord(rec) {
      return {
        id: rec.id,
        sensorReadings: rec.sensorReadings,               // Array
        cropPhoto: rec.cropPhoto,                         // String (URL)
        farmerNote: rec.farmerNote,                       // String
        gpsCoordinates: rec.gpsCoordinates,               // Number
        timestamp: rec.timestamp instanceof Date
          ? rec.timestamp.toISOString()
          : new Date(rec.timestamp).toISOString()
      };
    }
  
    /* =========================
       MAIN RUN
    ==========================*/
    const db = await openDB();
  
    if (CLEAR_BEFORE_INSERT) {
      await clearStore(db);
    }
  
    await addMany(db, TARGET_COUNT);
  
    const total = await countAll(db);
    console.log(`📦 Total records in ${STORE}:`, total);
  
    const sample = await getFirstN(db, 5);
    console.log('🧪 Sample (first 5, formatted):');
    sample.map(formatRecord).forEach((r, i) => console.log(`#${i + 1}`, r));
  
    // Also log raw to show preserved types (Date, Array, Number, String)
    console.log('🔬 Sample (raw objects to verify types):', sample);
  
      /* =========================
     UNIT TESTS (console.assert + pass messages)
  ==========================*/
  (async function runTests() {
    console.log('%cRunning unit tests…', 'font-weight:bold');

    function check(condition, message) {
      console.assert(condition, message);
      if (condition) {
        console.log(`✅ ${message} - Passed`);
      }
    }

    // 1) Count should be exactly TARGET_COUNT
    check(total === TARGET_COUNT, `Record count is ${TARGET_COUNT}`);

    // 2) sensorReadings should be an Array with length > 0
    const t1 = sample[0];
    check(Array.isArray(t1.sensorReadings) && t1.sensorReadings.length > 0,
      'sensorReadings is a non-empty Array');

    // 3) cropPhoto should end with .jpg/.jpeg/.png (case-insensitive)
    const photoOk = /\.(jpe?g|png)$/i.test(t1.cropPhoto);
    check(photoOk, `cropPhoto ends with valid image extension (${t1.cropPhoto})`);

    // 4) gpsCoordinates should be a finite Number within valid latitude range
    check(
      typeof t1.gpsCoordinates === 'number' &&
      Number.isFinite(t1.gpsCoordinates) &&
      t1.gpsCoordinates >= -90 && t1.gpsCoordinates <= 90,
      `gpsCoordinates is a number in [-90, 90]`
    );

    // 5) timestamp should be a valid Date
    const ts = t1.timestamp instanceof Date ? t1.timestamp : new Date(t1.timestamp);
    check(ts instanceof Date && !isNaN(ts.getTime()), `timestamp is a valid Date`);

    console.log('%cAll unit tests finished.', 'color: green; font-weight: bold;');
  })();

  
  })();