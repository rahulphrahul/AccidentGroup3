const mongoose = require("mongoose");

const sosAlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    accidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Accident", required: true, index: true },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["New", "ChatStarted", "Resolved"],
      default: "New",
      index: true,
    },
    message: { type: String, default: "Citizen requested urgent help through SOS." },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SOSAlert", sosAlertSchema);
