const express = require("express");
const { body } = require("express-validator");
const { register, login, forgotPassword, me } = require("../controllers/authController");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/register",
  [
    body("name").trim().notEmpty(),
    body("email").isEmail(),
    body("phone").trim().notEmpty(),
    body("password").isLength({ min: 6 }),
    body("role").optional().isIn(["citizen", "ambulance", "admin", "super_admin"]),
  ],
  register
);

router.post("/login", [body("email").isEmail(), body("password").notEmpty()], login);
router.post("/forgot-password", [body("email").isEmail()], forgotPassword);
router.get("/me", authRequired, me);

module.exports = router;
