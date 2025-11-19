async function expectCount(n) {
  const db = await openDB();
  const count = await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => res(req.result);
    tx.onerror = () => rej(tx.error);
  });
  db.close();
  return count;
}

async function takeSample(k = 10) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).getAll(undefined, k);
  const rows = await new Promise((res, rej) => {
    req.onsuccess = () => res(req.result || []);
    tx.onerror = () => rej(tx.error);
  });
  db.close();
  return rows;
}

async function test_dbOpens() {
  const db = await openDB();
  console.assert(
    db.name === "AgricultureDB",
    "DB should be named AgricultureDB"
  );
  console.assert(
    db.objectStoreNames.contains("FarmData"),
    'Object store "FarmData" should exist'
  );
  db.close();
}

async function test_rowCount() {
  const n = await expectCount(0);
  console.assert(n === 10000, `Expected 10000 rows, found ${n}`);
}

async function test_sensorArray() {
  const sample = await takeSample(20);
  const ok = sample.every(
    (r) => Array.isArray(r.sensorReadings) && r.sensorReadings.length >= 1
  );
  console.assert(ok, "sensorReadings must be a non-empty Array");
}

async function test_photoLooksRight() {
  const sample = await takeSample(50);
  const ok = sample.every(
    (r) =>
      typeof r.cropPhoto === "string" &&
      (/^images\/.+\.(jpg|jpeg|png|webp)$/i.test(r.cropPhoto) ||
        /^data:image\//i.test(r.cropPhoto))
  );
  console.assert(ok, "cropPhoto must be a local image path or data URL");
}

async function test_gps_and_time() {
  const sample = await takeSample(30);
  const okGPS = sample.every(
    (r) =>
      typeof r.gpsCoordinates === "number" && !Number.isNaN(r.gpsCoordinates)
  );
  const okTime = sample.every(
    (r) => r.timestamp instanceof Date && !Number.isNaN(r.timestamp.getTime())
  );
  console.assert(okGPS, "gpsCoordinates must be a Number");
  console.assert(okTime, "timestamp must be a valid Date");
}

window.runAllTests = async function runAllTests() {
  console.clear();
  console.log("Running tests...");
  try {
    await test_dbOpens();
    await test_rowCount();
    await test_sensorArray();
    await test_photoLooksRight();
    await test_gps_and_time();
    console.log(
      "%cAll tests completed (asserts show failures if any).",
      "color: #0a7a0a;"
    );
  } catch (e) {
    console.error("Test run crashed:", e);
  }
};
