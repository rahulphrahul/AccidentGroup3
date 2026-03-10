const { validationResult } = require("express-validator");
const Ambulance = require("../models/Ambulance");
const DispatchLog = require("../models/DispatchLog");
const Accident = require("../models/Accident");
const { dispatchForAccident } = require("../services/dispatchService");
const { emitToRole } = require("../services/socketManager");

exports.registerAmbulance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const existing = await Ambulance.findOne({ providerUserId: req.user._id });
    if (existing) {
      return res.status(409).json({ success: false, message: "Ambulance already registered" });
    }

    const ambulance = await Ambulance.create({
      providerUserId: req.user._id,
      driverName: req.body.driverName,
      vehicleNumber: req.body.vehicleNumber,
      location: req.body.location || { lat: 0, lng: 0 },
      availabilityStatus: req.body.availabilityStatus || "Offline",
      verificationStatus: "Pending",
    });

    res.status(201).json({ success: true, ambulance });
  } catch (error) {
    next(error);
  }
};

exports.getMyAmbulance = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findOne({ providerUserId: req.user._id });
    res.json({ success: true, ambulance });
  } catch (error) {
    next(error);
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findOneAndUpdate(
      { providerUserId: req.user._id },
      { availabilityStatus: req.body.availabilityStatus },
      { new: true }
    );

    if (!ambulance) {
      return res.status(404).json({ success: false, message: "Ambulance profile not found" });
    }

    res.json({ success: true, ambulance });
  } catch (error) {
    next(error);
  }
};

exports.updateLocation = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findOneAndUpdate(
      { providerUserId: req.user._id },
      { location: req.body.location },
      { new: true }
    );

    if (!ambulance) {
      return res.status(404).json({ success: false, message: "Ambulance profile not found" });
    }

    res.json({ success: true, ambulance });
  } catch (error) {
    next(error);
  }
};

exports.getMyDispatches = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findOne({ providerUserId: req.user._id });
    if (!ambulance) {
      return res.status(404).json({ success: false, message: "Ambulance profile not found" });
    }

    const dispatches = await DispatchLog.find({ ambulanceId: ambulance._id })
      .populate("accidentId")
      .sort({ createdAt: -1 });

    res.json({ success: true, dispatches });
  } catch (error) {
    next(error);
  }
};

exports.acceptDispatch = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findOne({ providerUserId: req.user._id });
    const dispatch = await DispatchLog.findOne({ _id: req.params.dispatchId, ambulanceId: ambulance?._id });

    if (!dispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found" });
    }

    dispatch.status = "Accepted";
    dispatch.acceptedTime = new Date();
    await dispatch.save();

    emitToRole("admin", "dispatch:updated", { dispatchId: dispatch._id, status: dispatch.status });
    emitToRole("super_admin", "dispatch:updated", { dispatchId: dispatch._id, status: dispatch.status });

    res.json({ success: true, dispatch });
  } catch (error) {
    next(error);
  }
};

exports.rejectDispatch = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findOne({ providerUserId: req.user._id });
    const dispatch = await DispatchLog.findOne({ _id: req.params.dispatchId, ambulanceId: ambulance?._id });

    if (!dispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found" });
    }

    dispatch.status = "Rejected";
    dispatch.reason = req.body.reason || "Rejected by provider";
    await dispatch.save();

    if (ambulance) {
      ambulance.availabilityStatus = "Available";
      await ambulance.save();
    }

    await dispatchForAccident({
      accidentId: dispatch.accidentId,
      reason: "Reassign after rejection",
      assignedBy: "system",
    });

    res.json({ success: true, dispatch });
  } catch (error) {
    next(error);
  }
};

exports.completeDispatch = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findOne({ providerUserId: req.user._id });
    const dispatch = await DispatchLog.findOne({ _id: req.params.dispatchId, ambulanceId: ambulance?._id });

    if (!dispatch) {
      return res.status(404).json({ success: false, message: "Dispatch not found" });
    }

    dispatch.status = "Completed";
    dispatch.completedTime = new Date();
    await dispatch.save();

    if (ambulance) {
      ambulance.availabilityStatus = "Available";
      await ambulance.save();
    }

    await Accident.findByIdAndUpdate(dispatch.accidentId, { status: "Resolved" });

    emitToRole("admin", "dispatch:updated", { dispatchId: dispatch._id, status: dispatch.status });
    emitToRole("super_admin", "dispatch:updated", { dispatchId: dispatch._id, status: dispatch.status });

    res.json({ success: true, dispatch });
  } catch (error) {
    next(error);
  }
};
