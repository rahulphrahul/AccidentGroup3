const mongoose = require("mongoose");

const dispatchLogSchema = new mongoose.Schema(
  {
    accidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Accident", required: true, index: true },
    ambulanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Ambulance" },
    assignedTime: { type: Date, default: Date.now },
    acceptedTime: { type: Date },
    completedTime: { type: Date },
    status: {
      type: String,
      enum: ["Assigned", "Accepted", "Rejected", "Completed", "Pending", "Cancelled"],
      default: "Pending",
    },
    reason: { type: String, default: "" },
    assignedBy: {
      type: String,
      enum: ["system", "admin"],
      default: "system",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DispatchLog", dispatchLogSchema);
