const express = require("express");
const { body } = require("express-validator");
const { submitResponse, getMyResponses } = require("../controllers/responseController");
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

module.exports = router;
