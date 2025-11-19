const http = require("http");
const ID = process.argv[2];
const RUNS = process.argv[3] || 20;

if (!ID) {
  console.error("Usage: node bench.js <_id> [runs]");
  process.exit(1);
}

function get(path) {
  return new Promise((res, rej) => {
    http.get(`http://localhost:3000${path}`, r => {
      let data = "";
      r.on("data", c => data += c);
      r.on("end", () => res(JSON.parse(data)));
    }).on("error", rej);
  });
}

(async () => {
  const out = await get(`/bench/cache-aside?id=${ID}&runs=${RUNS}`);
  console.log(out);
})();
