const mongoose = require("mongoose");
require("dotenv").config();

const uri = process.env.MONGO_URI;

// --- Define schema for readings ---
const readingSchema = new mongoose.Schema({
  sensorId: String,
  reading: Number,
  unit: String,
  updatedAt: Date,
  meta: {
    author: String
  }
});

const Reading = mongoose.model("Reading", readingSchema);

// --- Connect and insert data ---
async function seedData() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB Atlas");

    // Generate 2000 random sample records
    const sampleData = [];
    for (let i = 1; i <= 2000; i++) {
      sampleData.push({
        sensorId: `sensor-${Math.floor(Math.random() * 1000)}`,
        reading: (Math.random() * 100).toFixed(2),
        unit: "°C",
        updatedAt: new Date(),
        meta: { author: "Utkarsh Ajay Gawande" } // 👈 your author name
      });
    }

    await Reading.insertMany(sampleData);
    console.log("✅ 2000 sample readings inserted successfully!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error inserting sample data:", err);
  }
}

seedData();
