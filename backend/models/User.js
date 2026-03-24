const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    bloodGroup: { type: String, default: "", trim: true },
    emergencyContact: {
      name: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["citizen", "ambulance", "admin", "super_admin"],
      default: "citizen",
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    online: { type: Boolean, default: false },
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
