const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    twoFactorAuth: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      enum: ["Light", "Dark"],
      default: "Light",
    },
    language: {
      type: String,
      default: "English",
    },
    emailAlerts: {
      type: Boolean,
      default: true,
    },
    smsAlerts: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
