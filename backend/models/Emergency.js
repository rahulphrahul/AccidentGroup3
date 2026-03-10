const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accident",
      required: true,
    },
    ambulance: {
      type: Boolean,
      default: false,
    },
    police: {
      type: Boolean,
      default: false,
    },
    hospital: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Emergency", emergencySchema);
