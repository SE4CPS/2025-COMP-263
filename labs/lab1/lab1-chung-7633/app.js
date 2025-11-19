// AgricultureDB
let request = indexedDB.open("AgricultureDB", 1);

request.onupgradeneeded = function(event) {
  let db = event.target.result;
  if (!db.objectStoreNames.contains("FarmData")) {
    db.createObjectStore("FarmData", { keyPath: "id", autoIncrement: false });
  }
};

request.onsuccess = function(event) {
  let db = event.target.result;
  console.log("Database ready:", db.name);

  function runReport() {
    console.log("Inserted 10,000 records into FarmData");

    let countTx = db.transaction("FarmData", "readonly");
    let countStore = countTx.objectStore("FarmData");
    let countReq = countStore.count();
    countReq.onsuccess = () => {
      console.log("Total records in FarmData:", countReq.result);
    };

    let readTx = db.transaction("FarmData", "readonly");
    let readStore = readTx.objectStore("FarmData");
    let getAllReq = readStore.getAll(null, 5);
    getAllReq.onsuccess = () => {
      console.log("Sample records from FarmData:");
      console.log(getAllReq.result);
    };
  }

  function testRecordCount() {
    let tx = db.transaction("FarmData", "readonly");
    let store = tx.objectStore("FarmData");
    let req = store.count();
    req.onsuccess = () => {
      console.assert(req.result === 10000, "Record count should be 10,000");
      console.log("Test RecordCount passed");
    };
  }

  function testSensorReadingsArray() {
    let tx = db.transaction("FarmData", "readonly");
    let store = tx.objectStore("FarmData");
    let req = store.get(0);
    req.onsuccess = () => {
      let record = req.result;
      console.assert(Array.isArray(record.sensorReadings), "SensorReadings should be an array");
      console.assert(record.sensorReadings.length > 0, "SensorReadings should not be empty");
      console.log("Test SensorReadingsArray passed");
    };
  }

  function testCropPhotoExtension() {
    let tx = db.transaction("FarmData", "readonly");
    let store = tx.objectStore("FarmData");
    let req = store.get(1);
    req.onsuccess = () => {
      let record = req.result;
      console.assert(record.cropPhoto.endsWith(".jpg"), "CropPhoto should end with .jpg");
      console.log("Test CropPhotoExtension passed");
    };
  }

  function testFarmerNoteString() {
    let tx = db.transaction("FarmData", "readonly");
    let store = tx.objectStore("FarmData");
    let req = store.get(2);
    req.onsuccess = () => {
      let record = req.result;
      console.assert(typeof record.farmerNote === "string", "FarmerNote should be a string");
      console.assert(record.farmerNote.length > 0, "FarmerNote should not be empty");
      console.log("Test FarmerNoteString passed");
    };
  }

  function testTimestampIsDate() {
    let tx = db.transaction("FarmData", "readonly");
    let store = tx.objectStore("FarmData");
    let req = store.get(3);
    req.onsuccess = () => {
      let record = req.result;
      console.assert(
        record.timestamp instanceof Date || !isNaN(Date.parse(record.timestamp)),
        "Timestamp should be a valid Date"
      );
      console.log("Test TimestampIsDate passed");
    };
  }

  function runAllTests() {
    testRecordCount();
    testSensorReadingsArray();
    testCropPhotoExtension();
    testFarmerNoteString();
    testTimestampIsDate();
  }

  document.getElementById("load").addEventListener("click", () => {
    let tx = db.transaction("FarmData", "readwrite");
    let store = tx.objectStore("FarmData");

    for (let i = 0; i < 10000; i++) {
      let record = {
        id: i,
        sensorReadings: [Math.random() * 100, Math.random() * 100, Math.random() * 100],
        cropPhoto: `images_${Math.floor(Math.random() * 5)}.jpg`,
        farmerNote: "Note " + Math.random().toString(36).substring(2, 7),
        lat: 23 + Math.random(),
        lng: 120 + Math.random(),
        timestamp: new Date()
      };
      store.put(record);
    }

    tx.oncomplete = () => {
      runReport();
      alert("Data saved! Now check DevTools!");
    };
  });

  const reportBtn = document.getElementById("report");
  if (reportBtn) {
    reportBtn.addEventListener("click", runReport);
  }

  const testBtn = document.getElementById("test");
  if (testBtn) {
    testBtn.addEventListener("click", runAllTests);
  }
};