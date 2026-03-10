const SystemConfig = require("../models/SystemConfig");
const AccidentEmulation = require("../models/AccidentEmulation");
const { createAccidentAndTriggerWorkflow } = require("../services/accidentWorkflowService");
const { emitToRole } = require("../services/socketManager");

exports.getConfig = async (req, res, next) => {
  try {
    let config = await SystemConfig.findOne({ key: "global" });

    if (!config) {
      config = await SystemConfig.create({ key: "global", responseTimeoutSeconds: 60 });
    }

    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const responseTimeoutSeconds = Number(req.body.responseTimeoutSeconds);

    const config = await SystemConfig.findOneAndUpdate(
      { key: "global" },
      { responseTimeoutSeconds },
      { new: true, upsert: true }
    );

    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
};

exports.getPendingEmulations = async (req, res, next) => {
  try {
    const emulations = await AccidentEmulation.find({ status: "PendingApproval" })
      .populate("createdBy", "name email")
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

      return res.json({ success: true, emulation, accident });
    }

    if (action === "reject") {
      emulation.status = "Rejected";
      emulation.rejectionReason = rejectionReason || "Rejected by super admin";
      emulation.reviewedBy = req.user._id;
      emulation.reviewedAt = new Date();
      await emulation.save();

      emitToRole("admin", "emulation:reviewed", { emulationId: emulation._id, status: emulation.status });

      return res.json({ success: true, emulation });
    }

    return res.status(400).json({ success: false, message: "Invalid action" });
  } catch (error) {
    next(error);
  }
};
