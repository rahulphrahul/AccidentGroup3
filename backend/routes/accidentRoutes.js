const express = require("express");
const { body } = require("express-validator");
const {
  createFromDetectionEngine,
  getMyAccidents,
  manualCreateAccident,
} = require("../controllers/accidentController");
const { authRequired, rolesAllowed } = require("../middleware/authMiddleware");

const router = express.Router();

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

module.exports = router;
