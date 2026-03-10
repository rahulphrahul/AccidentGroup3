const express = require("express");
const { body } = require("express-validator");
const {
  registerAmbulance,
  getMyAmbulance,
  updateAvailability,
  updateLocation,
  getMyDispatches,
  acceptDispatch,
  rejectDispatch,
  completeDispatch,
} = require("../controllers/ambulanceController");
const { authRequired, rolesAllowed } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authRequired, rolesAllowed("ambulance"));

router.post(
  "/register",
  [body("driverName").trim().notEmpty(), body("vehicleNumber").trim().notEmpty()],
  registerAmbulance
);
router.get("/me", getMyAmbulance);
router.patch("/me/status", [body("availabilityStatus").isIn(["Available", "Busy", "Offline"])], updateAvailability);
router.patch(
  "/me/location",
  [body("location.lat").isFloat({ min: -90, max: 90 }), body("location.lng").isFloat({ min: -180, max: 180 })],
  updateLocation
);
router.get("/dispatches", getMyDispatches);
router.post("/dispatches/:dispatchId/accept", acceptDispatch);
router.post("/dispatches/:dispatchId/reject", rejectDispatch);
router.post("/dispatches/:dispatchId/complete", completeDispatch);

module.exports = router;
