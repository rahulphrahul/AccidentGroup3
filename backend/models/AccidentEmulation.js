const mongoose = require("mongoose");

const accidentEmulationSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    payload: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      severity: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        required: true,
      },
      confidenceScore: { type: Number, required: true, min: 0, max: 1 },
      cameraId: { type: String, default: "" },
      address: { type: String, default: "" },
      metadata: { type: mongoose.Schema.Types.Mixed },
    },
    status: {
      type: String,
      enum: ["PendingApproval", "Approved", "Rejected"],
      default: "PendingApproval",
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, default: "" },
    generatedAccidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Accident" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccidentEmulation", accidentEmulationSchema);
