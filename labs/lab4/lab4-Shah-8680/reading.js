import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const readingSchema = new mongoose.Schema({
  sensorId: String,
  reading: Number,
  unit: String,
  updatedAt: Date,
  meta: Object,
});

// Third argument sets the collection name dynamically from .env
export default mongoose.model("Reading", readingSchema, process.env.MONGO_COLLECTION);