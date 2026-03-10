const mongoose = require("mongoose");

const systemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    responseTimeoutSeconds: { type: Number, default: 60, min: 15, max: 600 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemConfig", systemConfigSchema);
