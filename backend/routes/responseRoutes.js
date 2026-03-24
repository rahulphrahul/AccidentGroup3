const express = require("express");
const { body } = require("express-validator");
const { submitResponse, getMyResponses, triggerSOSAlert } = require("../controllers/responseController");
const { authRequired, rolesAllowed } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/",
  authRequired,
  rolesAllowed("citizen"),
  [
    body("accidentId").isMongoId(),
    body("responseType").isIn(["Safe", "Help"]),
    body("responseTimeMs").optional().isInt({ min: 0 }),
  ],
  submitResponse
);

router.get("/me", authRequired, rolesAllowed("citizen"), getMyResponses);

router.post(
  "/sos",
  authRequired,
  rolesAllowed("citizen"),
  [body("latitude").isFloat({ min: -90, max: 90 }), body("longitude").isFloat({ min: -180, max: 180 })],
  triggerSOSAlert
);

module.exports = router;
