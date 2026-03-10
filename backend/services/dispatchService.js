const Accident = require("../models/Accident");
const Ambulance = require("../models/Ambulance");
const DispatchLog = require("../models/DispatchLog");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { haversineDistanceKm } = require("../utils/geo");
const { emitToRole, emitToUser } = require("./socketManager");

const getNearestAmbulance = async (accident) => {
  const ambulances = await Ambulance.find({
    availabilityStatus: "Available",
    verificationStatus: "Approved",
  });

  if (!ambulances.length) return null;

  const [accLng, accLat] = accident.location.coordinates;

  let nearest = null;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const ambulance of ambulances) {
    const distance = haversineDistanceKm(
      accLat,
      accLng,
      ambulance.location.lat,
      ambulance.location.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = ambulance;
    }
  }

  return { ambulance: nearest, distanceKm: minDistance };
};

exports.dispatchForAccident = async ({ accidentId, reason, assignedBy = "system" }) => {
  const accident = await Accident.findById(accidentId);
  if (!accident || accident.status === "Cancelled") {
    return null;
  }

  const inProgress = await DispatchLog.findOne({
    accidentId,
    status: { $in: ["Assigned", "Accepted", "Pending"] },
  });

  if (inProgress) {
    return inProgress;
  }

  const nearest = await getNearestAmbulance(accident);

  if (!nearest || !nearest.ambulance) {
    const pending = await DispatchLog.create({
      accidentId,
      status: "Pending",
      reason: reason || "No ambulance available",
      assignedBy,
    });

    emitToRole("admin", "dispatch:pending", { accidentId, reason: pending.reason });
    emitToRole("super_admin", "dispatch:pending", { accidentId, reason: pending.reason });

    return pending;
  }

  const log = await DispatchLog.create({
    accidentId,
    ambulanceId: nearest.ambulance._id,
    status: "Assigned",
    reason: reason || "User requested help",
    assignedBy,
  });

  nearest.ambulance.availabilityStatus = "Busy";
  await nearest.ambulance.save();

  const providerUserId = nearest.ambulance.providerUserId;

  await Notification.create({
    userId: providerUserId,
    accidentId,
    type: "DISPATCH_UPDATE",
    message: `New dispatch request assigned. Distance: ${nearest.distanceKm.toFixed(2)} km`,
  });

  emitToUser(providerUserId, "dispatch:assigned", {
    dispatchId: log._id,
    accidentId,
    distanceKm: nearest.distanceKm,
  });

  const admins = await User.find({ role: { $in: ["admin", "super_admin"] } }).select("_id");
  if (admins.length) {
    await Notification.insertMany(
      admins.map((admin) => ({
        userId: admin._id,
        accidentId,
        type: "DISPATCH_UPDATE",
        message: `Dispatch assigned to ambulance ${nearest.ambulance.vehicleNumber}`,
      }))
    );
  }

  emitToRole("admin", "dispatch:updated", { accidentId, dispatchId: log._id, status: "Assigned" });
  emitToRole("super_admin", "dispatch:updated", { accidentId, dispatchId: log._id, status: "Assigned" });

  return log;
};
