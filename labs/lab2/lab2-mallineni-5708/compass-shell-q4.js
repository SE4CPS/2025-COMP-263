use("Lab2");

(async () => {
  const ids = Array.from({ length: 10 }, (_, i) => i + 1);
  const nowUTC = () => new Date().toISOString();
  const uuidv4 = () =>
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
  const metadata = {
    author: "Ram Mallineni",
    last_sync: nowUTC(),
    uuid_source: uuidv4(),
  };
  const docs = ids.map((id) => ({
    id,
    sensorId: `S-${String(id).padStart(2, "0")}`,
    reading: 20 + id + id / 100,
    timestamp: new Date(Date.UTC(2025, 8, 1, 10, id, 0)).toISOString(),
    notes: `Seeded sample #${id}`,
    metadata,
  }));
  await db.Agriculture.deleteMany({ "metadata.author": "Ram Mallineni" });
  await db.Agriculture.insertMany(docs, { ordered: true });
  const cnt = await db.Agriculture.countDocuments({
    "metadata.author": "Ram Mallineni",
    id: { $in: ids },
  });
  const sample = await db.Agriculture.findOne(
    { "metadata.author": "Ram Mallineni", id: 1 },
    { projection: { _id: 0 } }
  );
  ({ verified: cnt, sample });
})();
