const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    accidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Accident", required: true, index: true },
    type: {
      type: String,
      enum: ["ACCIDENT_ALERT", "CHATBOT_TRIGGER", "DISPATCH_UPDATE", "SYSTEM"],
      required: true,
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
