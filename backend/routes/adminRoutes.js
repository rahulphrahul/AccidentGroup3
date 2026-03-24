const express = require("express");
const multer = require("multer");
const {
  getOverview,
  getAllAccidents,
  getDispatchLogs,
  cancelAccident,
  manualDispatch,
  verifyAmbulance,
  verifyAmbulanceByUser,
  getUsers,
  updateUser,
  deleteUser,
  createEmulation,
  analyzeEmulationImage,
  getEmulations,
  reviewEmulation,
  getSOSAlerts,
  startSOSChat,
  getChatHistory,
} = require("../controllers/adminController");
const { authRequired, rolesAllowed } = require("../middleware/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authRequired, rolesAllowed("admin", "super_admin"));

router.get("/overview", getOverview);
router.get("/sos-alerts", getSOSAlerts);
router.post("/sos-alerts/:alertId/start-chat", startSOSChat);
router.get("/accidents", getAllAccidents);
router.get("/dispatch-logs", getDispatchLogs);
router.post("/accidents/:accidentId/cancel", cancelAccident);
router.post("/accidents/:accidentId/manual-dispatch", manualDispatch);
router.patch("/ambulances/:ambulanceId/verify", verifyAmbulance);
router.patch("/users/:userId/ambulance-verify", verifyAmbulanceByUser);
router.get("/users", getUsers);
router.put("/users/:userId", updateUser);
router.delete("/users/:userId", deleteUser);
router.post("/emulations", createEmulation);
router.post("/emulations/analyze-image", upload.single("image"), analyzeEmulationImage);
router.get("/emulations", getEmulations);
router.post("/emulations/:emulationId/review", reviewEmulation);
router.get("/chat-logs", getChatHistory);

module.exports = router;
