const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
    },
    time: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);
