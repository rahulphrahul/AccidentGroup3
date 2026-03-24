const User = require("../models/User");
const Accident = require("../models/Accident");
const Response = require("../models/Response");
const DispatchLog = require("../models/DispatchLog");
const Ambulance = require("../models/Ambulance");
const ChatLog = require("../models/ChatLog");
const AccidentEmulation = require("../models/AccidentEmulation");
const SOSAlert = require("../models/SOSAlert");
const { createAccidentAndTriggerWorkflow } = require("../services/accidentWorkflowService");
const { dispatchForAccident } = require("../services/dispatchService");
const { emitToRole } = require("../services/socketManager");

exports.getOverview = async (req, res, next) => {
  try {
    const [
      users,
      citizens,
      ambulanceProviders,
      accidents,
      pendingAccidents,
      activeDispatches,
      unresolvedResponses,
      pendingEmulations,
      approvedEmulations,
      sosAlerts,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "citizen" }),
      User.countDocuments({ role: "ambulance" }),
      Accident.countDocuments(),
      Accident.countDocuments({ status: "Pending" }),
      DispatchLog.countDocuments({ status: { $in: ["Assigned", "Accepted", "Pending"] } }),
      Response.countDocuments({ responseType: "No Response" }),
      AccidentEmulation.countDocuments({ status: "PendingApproval" }),
      AccidentEmulation.countDocuments({ status: "Approved" }),
      SOSAlert.countDocuments({ status: { $in: ["New", "ChatStarted"] } }),
    ]);

    res.json({
      success: true,
      overview: {
        users,
        citizens,
        ambulanceProviders,
        accidents,
        pendingAccidents,
        activeDispatches,
        unresolvedResponses,
        pendingEmulations,
        approvedEmulations,
        sosAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getSOSAlerts = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find()
      .populate("userId", "name email phone role")
      .populate("accidentId", "severity status createdAt location")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, alerts });
  } catch (error) {
    next(error);
  }
};

exports.startSOSChat = async (req, res, next) => {
  try {
    const alert = await SOSAlert.findById(req.params.alertId).populate("userId", "name email role");
    if (!alert) {
      return res.status(404).json({ success: false, message: "SOS alert not found" });
    }

    let populatedLog = null;

    if (alert.status === "New") {
      alert.status = "ChatStarted";
      await alert.save();
      const introLog = await ChatLog.create({
        accidentId: alert.accidentId,
        userId: alert.userId._id,
        senderType: "system",
        message: "Admin joined the SOS support chat. Please describe your situation.",
        responseType: "Chat",
      });

      populatedLog = await ChatLog.findById(introLog._id)
        .populate("userId", "name email role")
        .populate("accidentId", "severity status createdAt location");

      emitToUser(alert.userId._id, "chat:message", { message: populatedLog });
      emitToRole("admin", "chat:message", { message: populatedLog });
      emitToRole("super_admin", "chat:message", { message: populatedLog });
    }

    emitToRole("admin", "sos:updated", { alertId: alert._id, status: alert.status });
    emitToRole("super_admin", "sos:updated", { alertId: alert._id, status: alert.status });

    res.json({ success: true, alert, messageLog: populatedLog });
  } catch (error) {
    next(error);
  }
};

exports.getAllAccidents = async (req, res, next) => {
  try {
    const accidents = await Accident.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, accidents });
  } catch (error) {
    next(error);
  }
};

exports.getDispatchLogs = async (req, res, next) => {
  try {
    const logs = await DispatchLog.find()
      .populate("accidentId")
      .populate("ambulanceId")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};

exports.cancelAccident = async (req, res, next) => {
  try {
    const accident = await Accident.findByIdAndUpdate(
      req.params.accidentId,
      { status: "Cancelled" },
      { new: true }
    );

    if (!accident) {
      return res.status(404).json({ success: false, message: "Accident not found" });
    }

    await DispatchLog.updateMany(
      {
        accidentId: accident._id,
        status: { $in: ["Assigned", "Accepted", "Pending"] },
      },
      { status: "Cancelled", reason: "Cancelled by admin" }
    );

    res.json({ success: true, accident });
  } catch (error) {
    next(error);
  }
};

exports.manualDispatch = async (req, res, next) => {
  try {
    const dispatch = await dispatchForAccident({
      accidentId: req.params.accidentId,
      reason: req.body.reason || "Manual dispatch by admin",
      assignedBy: "admin",
    });

    res.json({ success: true, dispatch });
  } catch (error) {
    next(error);
  }
};

exports.verifyAmbulance = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.ambulanceId,
      { verificationStatus: req.body.verificationStatus },
      { new: true }
    );

    if (!ambulance) {
      return res.status(404).json({ success: false, message: "Ambulance not found" });
    }

    res.json({ success: true, ambulance });
  } catch (error) {
    next(error);
  }
};

exports.verifyAmbulanceByUser = async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findOneAndUpdate(
      { providerUserId: req.params.userId },
      { verificationStatus: req.body.verificationStatus },
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

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
    const ambulanceProfiles = await Ambulance.find({
      providerUserId: { $in: users.filter((user) => user.role === "ambulance").map((user) => user._id) },
    }).lean();

    const ambulanceByUserId = new Map(
      ambulanceProfiles.map((ambulance) => [String(ambulance.providerUserId), ambulance])
    );

    const usersWithAmbulance = users.map((user) => ({
      ...user,
      ambulanceProfile: ambulanceByUserId.get(String(user._id)) || null,
    }));
    res.json({ success: true, users: usersWithAmbulance });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, req.body, { new: true }).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    next(error);
  }
};

exports.createEmulation = async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const emulation = await AccidentEmulation.create({
      createdBy: req.user._id,
      payload: {
        latitude: Number(req.body.latitude),
        longitude: Number(req.body.longitude),
        severity: req.body.severity,
        confidenceScore: Number(req.body.confidenceScore),
        cameraId: req.body.cameraId || "",
        address: req.body.address || "",
        metadata: req.body.metadata,
      },
      status: req.user.role === "super_admin" ? "Approved" : "PendingApproval",
      reviewedBy: req.user.role === "super_admin" ? req.user._id : undefined,
      reviewedAt: req.user.role === "super_admin" ? new Date() : undefined,
    });

    emitToRole("super_admin", "emulation:new", {
      emulationId: emulation._id,
      status: emulation.status,
    });

    res.status(201).json({ success: true, emulation });
  } catch (error) {
    next(error);
  }
};

exports.analyzeEmulationImage = async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image file is required" });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([req.file.buffer], { type: req.file.mimetype || "image/jpeg" }),
      req.file.originalname || "upload.jpg"
    );
    formData.append("latitude", req.body.latitude || "");
    formData.append("longitude", req.body.longitude || "");
    formData.append("address", req.body.address || "");
    formData.append("camera_id", req.body.cameraId || "");

    const response = await fetch(`${aiServiceUrl.replace(/\/+$/, "")}/analyze-image`, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: payload.detail || payload.message || "AI analysis service failed",
      });
    }

    res.json({
      success: true,
      analysis: payload.analysis,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEmulations = async (req, res, next) => {
  try {
    const query = {};

    const emulations = await AccidentEmulation.find(query)
      .populate("createdBy", "name email role")
      .populate("reviewedBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, emulations });
  } catch (error) {
    next(error);
  }
};

exports.reviewEmulation = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;

    const emulation = await AccidentEmulation.findById(req.params.emulationId);
    if (!emulation) {
      return res.status(404).json({ success: false, message: "Emulation not found" });
    }

    if (emulation.status !== "PendingApproval") {
      return res.status(409).json({ success: false, message: "Emulation already reviewed" });
    }

    if (action === "approve") {
      const accident = await createAccidentAndTriggerWorkflow({
        payload: emulation.payload,
        source: "manual",
      });

      emulation.status = "Approved";
      emulation.generatedAccidentId = accident._id;
      emulation.reviewedBy = req.user._id;
      emulation.reviewedAt = new Date();
      await emulation.save();

      emitToRole("admin", "emulation:reviewed", { emulationId: emulation._id, status: emulation.status });
      emitToRole("super_admin", "emulation:reviewed", { emulationId: emulation._id, status: emulation.status });

      return res.json({ success: true, emulation, accident });
    }

    if (action === "reject") {
      emulation.status = "Rejected";
      emulation.rejectionReason = rejectionReason || "Rejected by admin";
      emulation.reviewedBy = req.user._id;
      emulation.reviewedAt = new Date();
      await emulation.save();

      emitToRole("admin", "emulation:reviewed", { emulationId: emulation._id, status: emulation.status });
      emitToRole("super_admin", "emulation:reviewed", { emulationId: emulation._id, status: emulation.status });

      return res.json({ success: true, emulation });
    }

    return res.status(400).json({ success: false, message: "Invalid action" });
  } catch (error) {
    next(error);
  }
};

exports.getChatHistory = async (req, res, next) => {
  try {
    const logs = await ChatLog.find()
      .populate("userId", "name email role")
      .populate("accidentId", "severity status createdAt")
      .sort({ createdAt: -1 })
      .limit(400);

    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};
