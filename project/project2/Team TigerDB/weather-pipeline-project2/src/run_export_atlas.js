const {
  fetchHistoricalLast12Months,
  toDailyDocs,
} = require("./services/weatherApi");
const { exportToAtlas } = require("./etl/export_to_atlas");

(async () => {
  try {
    const data = await fetchHistoricalLast12Months();
    const { docs } = toDailyDocs(data);

    await exportToAtlas(docs, docs);

    console.log("Exported to MongoDB Atlas with team + author metadata.");
  } catch (err) {
    console.error("Export to Atlas failed:", err);
  } finally {
    process.exit(0);
  }
})();
