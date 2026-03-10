const mongoose = require("mongoose");

const mlPredictionSchema = new mongoose.Schema(
  {
    accidentRisk: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
    },
    severity: {
      type: String,
      required: true,
    },
    accuracy: {
      type: Number,
      required: true,
    },
    decision: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MLPrediction", mlPredictionSchema);
