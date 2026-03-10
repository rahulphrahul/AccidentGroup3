const express = require("express");
const { getMyNotifications, markRead } = require("../controllers/notificationController");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authRequired, getMyNotifications);
router.patch("/:notificationId/read", authRequired, markRead);

module.exports = router;
