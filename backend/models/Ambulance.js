const mongoose = require("mongoose");

const ambulanceSchema = new mongoose.Schema(
  {
    providerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    driverName: { type: String, required: true },
    vehicleNumber: { type: String, required: true, unique: true },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    availabilityStatus: {
      type: String,
      enum: ["Available", "Busy", "Offline"],
      default: "Offline",
    },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ambulance", ambulanceSchema);
