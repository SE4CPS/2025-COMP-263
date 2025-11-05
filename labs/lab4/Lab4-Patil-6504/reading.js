import mongoose from "mongoose";

const ReadingSchema = new mongoose.Schema(
  {
    sensorId: { type: String, required: true },
    reading: { type: Number, required: true },
    unit: { type: String, default: "°C" },
    updatedAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { collection: "readings" }
);

const Reading = mongoose.models.Reading || mongoose.model("Reading", ReadingSchema, "readings");

export default Reading;



