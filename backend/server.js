const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const accidentRoutes = require("./routes/accidentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const responseRoutes = require("./routes/responseRoutes");
const ambulanceRoutes = require("./routes/ambulanceRoutes");
const adminRoutes = require("./routes/adminRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { setIo } = require("./services/socketManager");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

setIo(io);

const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const envOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-detection-key"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) => {
  res.json({ success: true, status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/accidents", accidentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/ambulances", ambulanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/chat", chatRoutes);

// Compatibility aliases in case clients are configured without /api prefix.
app.use("/auth", authRoutes);
app.use("/accidents", accidentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/responses", responseRoutes);
app.use("/ambulances", ambulanceRoutes);
app.use("/admin", adminRoutes);
app.use("/super-admin", superAdminRoutes);
app.use("/chat", chatRoutes);

app.get("/api/routes", (req, res) => {
  res.json({
    success: true,
    routes: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/me",
      "POST /api/accidents/events",
      "GET /api/accidents/my-history",
      "POST /api/accidents/manual",
      "GET /api/notifications/me",
      "PATCH /api/notifications/:notificationId/read",
      "POST /api/responses",
      "GET /api/responses/me",
      "POST /api/ambulances/register",
      "GET /api/ambulances/me",
      "PATCH /api/ambulances/me/status",
      "PATCH /api/ambulances/me/location",
      "GET /api/ambulances/dispatches",
      "POST /api/ambulances/dispatches/:dispatchId/accept",
      "POST /api/ambulances/dispatches/:dispatchId/reject",
      "POST /api/ambulances/dispatches/:dispatchId/complete",
      "GET /api/admin/overview",
      "GET /api/admin/accidents",
      "GET /api/admin/dispatch-logs",
      "POST /api/admin/accidents/:accidentId/cancel",
      "POST /api/admin/accidents/:accidentId/manual-dispatch",
      "PATCH /api/admin/ambulances/:ambulanceId/verify",
      "GET /api/admin/users",
      "PUT /api/admin/users/:userId",
      "DELETE /api/admin/users/:userId",
      "POST /api/admin/emulations",
      "POST /api/admin/emulations/analyze-image",
      "GET /api/admin/emulations",
      "GET /api/admin/chat-logs",
      "GET /api/chat/conversations",
      "GET /api/chat/messages",
      "POST /api/chat/messages",
      "GET /api/super-admin/config",
      "PUT /api/super-admin/config",
      "GET /api/super-admin/emulations/pending",
      "POST /api/super-admin/emulations/:emulationId/review",
    ],
  });
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = await User.findById(decoded.userId).select("_id role");

    if (user) {
      socket.user = user;
    }

    return next();
  } catch (error) {
    return next();
  }
});

io.on("connection", async (socket) => {
  if (socket.user) {
    const userId = String(socket.user._id);
    const role = socket.user.role;

    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);

    await User.findByIdAndUpdate(userId, { online: true, lastSeenAt: new Date() });
  }

  socket.on("disconnect", async () => {
    if (socket.user) {
      await User.findByIdAndUpdate(socket.user._id, {
        online: false,
        lastSeenAt: new Date(),
      });
    }
  });
});

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    const PORT = Number(process.env.PORT || 5000);
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

start();
