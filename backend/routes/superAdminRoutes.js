const express = require("express");
const {
  getConfig,
  updateConfig,
  getPendingEmulations,
  reviewEmulation,
} = require("../controllers/superAdminController");
const { authRequired, rolesAllowed } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authRequired, rolesAllowed("super_admin"));
router.get("/config", getConfig);
router.put("/config", updateConfig);
router.get("/emulations/pending", getPendingEmulations);
router.post("/emulations/:emulationId/review", reviewEmulation);

module.exports = router;
