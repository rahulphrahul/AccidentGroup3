const mongoose = require("mongoose");

const accidentSchema = new mongoose.Schema(
  {
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      address: { type: String, default: "" },
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      required: true,
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    cameraId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Resolved", "Cancelled"],
      default: "Pending",
    },
    source: {
      type: String,
      enum: ["external_engine", "manual"],
      default: "external_engine",
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

accidentSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Accident", accidentSchema);
