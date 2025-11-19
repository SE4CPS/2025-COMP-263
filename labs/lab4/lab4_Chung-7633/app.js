// app.js (Node 14.15.1 compatible)
require("dotenv").config();

var express = require("express");
var MongoClient = require("mongodb").MongoClient;
var Redis = require("ioredis");

var app = express();

var PORT = process.env.PORT || 3000;
var HOST = process.env.MONGO_HOST;
var USER = process.env.MONGO_USER;
var PASS = process.env.MONGO_PASS;
var REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
var CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60);

// Validate env
(function validateEnv() {
  var missing = [];
  if (!HOST) missing.push("MONGO_HOST");
  if (!USER) missing.push("MONGO_USER");
  if (!PASS) missing.push("MONGO_PASS");
  if (missing.length > 0) {
    console.error("Missing env var(s): " + missing.join(", "));
    process.exit(1);
  }
})();

// Mongo client (v4)
var client = new MongoClient(HOST + "/?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  auth: { username: USER, password: PASS },
  authSource: "admin"
});

// Redis client
var redis = new Redis(REDIS_URL);

var collection = null;

// Startup
redis.on("connect", function () { console.log("Redis connected: " + REDIS_URL); });
redis.on("error", function (e) { console.error("Redis error:", e && e.message ? e.message : e); });

(function start() {
  client.connect()
    .then(function () { return client.db("admin").command({ ping: 1 }); })
    .then(function () {
      var db = client.db("AgriDB");
      collection = db.collection("readings");
      return collection.estimatedDocumentCount();
    })
    .then(function (count) {
      var hostClean = (HOST || "").replace(/^mongodb\+srv:\/\//, "");
      console.log("Connected to " + hostClean);
      console.log("AgriDB.readings docs: " + count);
    })
          .catch(function (err) {
      console.error("DB connection error:", err && err.message ? err.message : err);
      process.exit(1);
      

      });

// CACHE-ASIDE
app.get("/cache-aside/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `reading:${sensorId}`;
  const start = process.hrtime.bigint();

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const timeMs = Number((process.hrtime.bigint() - start) / 1000000n);
      return res.json({ source: "cache", timeMs, data: JSON.parse(cached) });
    }

    const doc = await collection.findOne({ sensorId });
    if (!doc) return res.status(404).json({ message: "Not found" });

    await redis.set(cacheKey, JSON.stringify(doc));
    const timeMs = Number((process.hrtime.bigint() - start) / 1000000n);
    res.json({ source: "mongo", timeMs, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BASELINE (no cache, pure MongoDB access)
app.get("/baseline/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const start = Date.now();

  try {
    const doc = await collection.findOne({ sensorId });
    if (!doc) return res.status(404).json({ message: "Not found" });

    const elapsed = Date.now() - start;
    res.json({
      source: "mongo (no cache)",
      timeMs: elapsed,
      data: doc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ-THROUGH
app.get("/read-through/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `reading:${sensorId}`;
  const start = process.hrtime.bigint();

  try {
    let data = await redis.get(cacheKey);
    if (!data) {
      const doc = await collection.findOne({ sensorId });
      if (!doc) return res.status(404).json({ message: "Not found" });
      await redis.set(cacheKey, JSON.stringify(doc));
      data = JSON.stringify(doc);
    }

    const timeMs = Number((process.hrtime.bigint() - start) / 1000000n);
    res.json({ source: data ? "read-through" : "mongo", timeMs, data: JSON.parse(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EXPIRATION-BASED (TTL)
app.get("/ttl/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `ttl:${sensorId}`;
  const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS) || 60;
  const start = process.hrtime.bigint();

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const timeMs = Number((process.hrtime.bigint() - start) / 1000000n);
      return res.json({ source: "cache (TTL active)", timeMs, data: JSON.parse(cached) });
    }

    const doc = await collection.findOne({ sensorId });
    if (!doc) return res.status(404).json({ message: "Not found" });

    await redis.set(cacheKey, JSON.stringify(doc), "EX", ttlSeconds);
    const timeMs = Number((process.hrtime.bigint() - start) / 1000000n);
    res.json({ source: "mongo", timeMs, ttl: ttlSeconds, data: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, function () {
    console.log("Server running at http://localhost:" + PORT);

    });
})();

// Timing helpers
function withTimer(handler) {
  return function (req, res) {
    var start = process.hrtime.bigint();
    Promise.resolve(handler(req, res, start)).catch(function (e) {
      console.error("Handler error:", e);
      res.status(500).json({ error: String(e) });
    });
  };
}
function elapsedMs(start) {
  return Number((process.hrtime.bigint() - start) / 1000000n);
}

// GET /readings/mongo
app.get("/readings/mongo", withTimer(function (req, res, start) {
  if (!collection) return res.status(503).send("Database not initialized");
  collection.find({}).limit(500).toArray()
    .then(function (docs) {
      var body = { source: "mongo", timeMs: elapsedMs(start), count: docs.length, data: docs };
      res.set("X-Response-Time", body.timeMs + "ms").json(body);
    })
    .catch(function (e) { res.status(500).json({ error: String(e) }); });
}));

// GET /readings/redis
app.get("/readings/redis", withTimer(function (req, res, start) {
  if (!collection) return res.status(503).send("Database not initialized");

  var crop = (req.query && req.query.crop ? String(req.query.crop) : "").toLowerCase();
  var key = "agri:all:limit500" + (crop ? ":crop=" + crop : "");

  redis.get(key).then(function (cached) {
    if (cached) {
      var data = JSON.parse(cached);
      var bodyCached = { source: "redis", timeMs: elapsedMs(start), count: data.length, data: data };
      res.set("X-Response-Time", bodyCached.timeMs + "ms").json(bodyCached);
      return null; // stop chain
    }
    var query = crop ? { crop: { $regex: "^" + crop + "$", $options: "i" } } : {};
    return collection.find(query).limit(500).toArray()
      .then(function (docs) {
        return redis.set(key, JSON.stringify(docs), "EX", CACHE_TTL_SECONDS)
          .then(function () {
            var bodyNew = { source: "mongo->redis(set)", timeMs: elapsedMs(start), count: docs.length, data: docs };
            res.set("X-Response-Time", bodyNew.timeMs + "ms").json(bodyNew);
          });
      });
  }).catch(function (e) {
    res.status(500).json({ error: String(e) });
  });
}));

// POST /readings/refresh
app.post("/readings/refresh", withTimer(function (req, res, start) {
  redis.keys("agri:*")
    .then(function (keys) {
      if (!keys || keys.length === 0) return 0;
      return redis.del(keys);
    })
    .then(function (deleted) {
      var body = { ok: true, deletedKeys: deleted || 0, timeMs: elapsedMs(start) };
      res.set("X-Response-Time", body.timeMs + "ms").json(body);
    })
    .catch(function (e) { res.status(500).json({ error: String(e) }); });
}));

// GET /health
app.get("/health", function (req, res) {
  res.json({
    ok: !!collection,
    redis: redis.status,
    cluster: (HOST || "").replace(/^mongodb\+srv:\/\//, "")
  });
});

// GET /debug/readings
app.get("/debug/readings", withTimer(function (req, res, start) {
  if (!collection) return res.status(503).send("Database not initialized");
  collection.estimatedDocumentCount()
    .then(function (count) { return collection.find({}).limit(5).toArray().then(function (sample) { return { count: count, sample: sample }; }); })
    .then(function (r) {
      var body = { db: "AgriDB", collection: "readings", count: r.count, sample: r.sample, timeMs: elapsedMs(start) };
      res.set("X-Response-Time", body.timeMs + "ms").json(body);
    })
    .catch(function (e) { res.status(500).json({ error: String(e) }); });
}));