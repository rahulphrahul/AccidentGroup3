const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { body } = require("express-validator");
const {
  createFromDetectionEngine,
  getMyAccidents,
  getMyIncidentReports,
  manualCreateAccident,
  submitCitizenIncident,
} = require("../controllers/accidentController");
const { authRequired, rolesAllowed } = require("../middleware/authMiddleware");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads", "incident-media");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post(
  "/events",
  [
    body("latitude").isFloat({ min: -90, max: 90 }),
    body("longitude").isFloat({ min: -180, max: 180 }),
    body("severity").isIn(["Low", "Medium", "High", "Critical"]),
    body("confidenceScore").isFloat({ min: 0, max: 1 }),
  ],
  createFromDetectionEngine
);

router.get("/my-history", authRequired, rolesAllowed("citizen"), getMyAccidents);
router.get("/my-reports", authRequired, rolesAllowed("citizen"), getMyIncidentReports);

router.post(
  "/manual",
  authRequired,
  rolesAllowed("admin", "super_admin"),
  [
    body("latitude").isFloat({ min: -90, max: 90 }),
    body("longitude").isFloat({ min: -180, max: 180 }),
    body("severity").isIn(["Low", "Medium", "High", "Critical"]),
  ],
  manualCreateAccident
);

router.post(
  "/report",
  authRequired,
  rolesAllowed("citizen"),
  upload.single("media"),
  submitCitizenIncident
);

module.exports = router;
