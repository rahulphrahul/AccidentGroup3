const Accident = require("../models/Accident");
const Notification = require("../models/Notification");
const User = require("../models/User");
const SystemConfig = require("../models/SystemConfig");
const ChatLog = require("../models/ChatLog");
const { emitToUser, emitToRole } = require("./socketManager");
const { startSafetyTimer } = require("./timerService");

const getTimeoutMs = async () => {
  const config = await SystemConfig.findOne({ key: "global" });
  return (config?.responseTimeoutSeconds || 60) * 1000;
};

exports.createAccidentAndTriggerWorkflow = async ({ payload, source = "external_engine" }) => {
  const { latitude, longitude, severity, confidenceScore, cameraId, address, metadata } = payload;

  const accident = await Accident.create({
    location: {
      type: "Point",
      coordinates: [longitude, latitude],
      address: address || "",
    },
    severity,
    confidenceScore,
    cameraId: cameraId || "",
    source,
    metadata,
  });

  const citizens = await User.find({ role: "citizen" }).select("_id");

  if (citizens.length) {
    await Notification.insertMany(
      citizens.map((u) => ({
        userId: u._id,
        accidentId: accident._id,
        type: "ACCIDENT_ALERT",
        message: "Accident detected nearby. Please confirm your safety.",
      }))
    );

    await ChatLog.insertMany(
      citizens.map((u) => ({
        accidentId: accident._id,
        userId: u._id,
        senderType: "system",
        message: "Accident detected nearby. Are you safe?",
        responseType: "Prompt",
      }))
    );
  }

  const timeoutMs = await getTimeoutMs();

  for (const citizen of citizens) {
    emitToUser(citizen._id, "alert:accident", {
      accidentId: accident._id,
      severity: accident.severity,
      location: accident.location,
    });

    emitToUser(citizen._id, "chatbot:trigger", {
      accidentId: accident._id,
      message: "Accident detected nearby. Are you safe?",
    });

    startSafetyTimer({ accidentId: accident._id, userId: citizen._id, timeoutMs });
  }

  emitToRole("admin", "accident:new", { accidentId: accident._id });
  emitToRole("super_admin", "accident:new", { accidentId: accident._id });

  return accident;
};
