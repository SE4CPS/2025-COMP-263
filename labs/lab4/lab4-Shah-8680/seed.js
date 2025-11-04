import mongoose from "mongoose";
import dotenv from "dotenv";
import Reading from "./reading.js";

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB...");

    const data = [];
    for (let i = 0; i < 2000; i++) {
      data.push({
        sensorId: `sensor-${i}`,
        reading: Math.random() * 100,
        unit: "°C",
        updatedAt: new Date(),
        meta: { author: "Parth" },
      });
    }

    await Reading.insertMany(data);
    console.log(`✅ Inserted ${data.length} sample readings into collection "${process.env.MONGO_COLLECTION}"!`);

    process.exit();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
