const {
  fetchHistoricalLast12Months,
  toDailyDocs,
} = require("../services/weatherApi");
const { getMongoDb } = require("../services/mongoClient");

async function etlApiToMongo() {
  const data = await fetchHistoricalLast12Months();
  const { docs, batch } = toDailyDocs(data);

  const db = await getMongoDb();
  const col = db.collection("weather_daily");

  const min = docs[0].date;
  const max = docs[docs.length - 1].date;

  await col.deleteMany({ date: { $gte: min, $lte: max } });
  await col.insertMany(docs);

  return batch;
}

module.exports = { etlApiToMongo };
