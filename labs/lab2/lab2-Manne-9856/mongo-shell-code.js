use("Lab2");

(async () => {
  const ids = Array.from({ length: 10 }, (_, i) => i + 1);
  const toUTC = (n) =>
    new Date(Date.UTC(2025, 8, 1, 9, (n * 3) % 60, 30)).toISOString();
  const now = () => new Date().toISOString();
  const uuid = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
      .split("")
      .map((c) =>
        c === "x" || c === "y"
          ? c === "x"
            ? ((Math.random() * 16) | 0).toString(16)
            : ((((Math.random() * 16) | 0) & 0x3) | 0x8).toString(16)
          : c
      )
      .join("");
  const meta = {
    author: "Sai Nikhitha Manne",
    last_sync: now(),
    uuid_source: uuid(),
  };

  await db.Agriculture.deleteMany({ "metadata.author": "Sai Nikhitha Manne" });

  const ops = ids.map((n) => ({
    insertOne: {
      document: {
        id: n,
        sensorId: `SN-${String(n).padStart(2, "0")}`,
        reading: +(18 + n * 1.5 + (n % 3) / 100).toFixed(2),
        timestamp: toUTC(n),
        notes: `Record ${n}`,
        metadata: meta,
      },
    },
  }));

  await db.Agriculture.bulkWrite(ops, { ordered: true });

  const verified = await db.Agriculture.countDocuments({
    "metadata.author": "Sai Nikhitha Manne",
    id: { $in: ids },
  });
  const sample = await db.Agriculture.findOne(
    { "metadata.author": "Sai Nikhitha Manne", id: 1 },
    { projection: { _id: 0 } }
  );

  ({ verified, sample });
})();
