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
(function start() {
  client.connect()
    .then(function () { return client.db("admin").command({ ping: 1 }); })
    .then(function () {
      var db = client.db("Lab2");
      collection = db.collection("Agriculture");
      return collection.estimatedDocumentCount();
    })
    .then(function (count) {
      var hostClean = (HOST || "").replace(/^mongodb\+srv:\/\//, "");
      console.log("Connected to " + hostClean);
      console.log("Lab2.Agriculture docs: " + count);

      redis.on("connect", function () { console.log("Redis connected: " + REDIS_URL); });
      redis.on("error", function (e) { console.error("Redis error:", e && e.message ? e.message : e); });

      app.listen(PORT, function () {
        console.log("Server running at http://localhost:" + PORT);
      });
    })
    .catch(function (err) {
      console.error("DB connection error:", err && err.message ? err.message : err);
      process.exit(1);
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

// GET /agriculture/mongo
app.get("/agriculture/mongo", withTimer(function (req, res, start) {
  if (!collection) return res.status(503).send("Database not initialized");
  collection.find({}).limit(500).toArray()
    .then(function (docs) {
      var body = { source: "mongo", timeMs: elapsedMs(start), count: docs.length, data: docs };
      res.set("X-Response-Time", body.timeMs + "ms").json(body);
    })
    .catch(function (e) { res.status(500).json({ error: String(e) }); });
}));

// GET /agriculture/redis
app.get("/agriculture/redis", withTimer(function (req, res, start) {
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

// POST /agriculture/refresh
app.post("/agriculture/refresh", withTimer(function (req, res, start) {
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

// GET /debug/agriculture
app.get("/debug/agriculture", withTimer(function (req, res, start) {
  if (!collection) return res.status(503).send("Database not initialized");
  collection.estimatedDocumentCount()
    .then(function (count) { return collection.find({}).limit(5).toArray().then(function (sample) { return { count: count, sample: sample }; }); })
    .then(function (r) {
      var body = { db: "Lab2", collection: "Agriculture", count: r.count, sample: r.sample, timeMs: elapsedMs(start) };
      res.set("X-Response-Time", body.timeMs + "ms").json(body);
    })
    .catch(function (e) { res.status(500).json({ error: String(e) }); });
}));