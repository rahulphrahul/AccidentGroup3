const mongoose = require("mongoose");

const chatLogSchema = new mongoose.Schema(
  {
    accidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accident",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ["system", "user", "admin"],
      required: true,
    },
    message: { type: String, required: true },
    responseType: {
      type: String,
      enum: ["Safe", "Help", "No Response", "Prompt", "Chat"],
      default: "Chat",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatLog", chatLogSchema);
