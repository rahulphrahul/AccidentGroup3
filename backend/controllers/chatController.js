const { validationResult } = require("express-validator");
const Accident = require("../models/Accident");
const ChatLog = require("../models/ChatLog");
const User = require("../models/User");
const { emitToRole, emitToUser } = require("../services/socketManager");
const { generateAIReply } = require("../services/aiChatService");

const populateLog = (query) =>
  query.populate("userId", "name email role").populate("accidentId", "severity status createdAt location");

exports.getConversations = async (req, res, next) => {
  try {
    if (!["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const grouped = await ChatLog.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { userId: "$userId", accidentId: "$accidentId" },
          latestMessage: { $first: "$message" },
          latestSenderType: { $first: "$senderType" },
          latestResponseType: { $first: "$responseType" },
          latestCreatedAt: { $first: "$createdAt" },
        },
      },
      { $sort: { latestCreatedAt: -1 } },
      { $limit: 200 },
    ]);

    const userIds = grouped.map((item) => item._id.userId);
    const accidentIds = grouped.map((item) => item._id.accidentId);

    const [users, accidents] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select("name email role online"),
      Accident.find({ _id: { $in: accidentIds } }).select("severity status location createdAt"),
    ]);

    const usersById = new Map(users.map((user) => [String(user._id), user]));
    const accidentsById = new Map(accidents.map((accident) => [String(accident._id), accident]));

    const conversations = grouped.map((item) => ({
      userId: item._id.userId,
      accidentId: item._id.accidentId,
      latestMessage: item.latestMessage,
      latestSenderType: item.latestSenderType,
      latestResponseType: item.latestResponseType,
      latestCreatedAt: item.latestCreatedAt,
      user: usersById.get(String(item._id.userId)) || null,
      accident: accidentsById.get(String(item._id.accidentId)) || null,
    }));

    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const accidentId = req.query.accidentId;
    const targetUserId = req.user.role === "citizen" ? req.user._id : req.query.userId;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const query = { userId: targetUserId };
    if (accidentId) {
      query.accidentId = accidentId;
    }

    const messages = await populateLog(ChatLog.find(query).sort({ createdAt: 1 }).limit(300));

    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { accidentId, message } = req.body;
    const userId = req.user.role === "citizen" ? req.user._id : req.body.userId;

    const [accident, user] = await Promise.all([
      Accident.findById(accidentId).select("_id"),
      User.findById(userId).select("_id"),
    ]);

    if (!accident) {
      return res.status(404).json({ success: false, message: "Accident not found" });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const chatLog = await ChatLog.create({
      accidentId,
      userId,
      senderType: req.user.role === "citizen" ? "user" : "admin",
      message: message.trim(),
      responseType: "Chat",
    });

    const populatedLog = await populateLog(ChatLog.findById(chatLog._id));

    emitToUser(userId, "chat:message", { message: populatedLog });
    emitToRole("admin", "chat:message", { message: populatedLog });
    emitToRole("super_admin", "chat:message", { message: populatedLog });

    if (req.user.role === "citizen") {
      Promise.resolve()
        .then(async () => {
          const aiReply = await generateAIReply({ accidentId, userId });
          if (!aiReply) return;

          const aiLog = await ChatLog.create({
            accidentId,
            userId,
            senderType: "ai",
            message: aiReply,
            responseType: "Chat",
          });

          const populatedAiLog = await populateLog(ChatLog.findById(aiLog._id));

          emitToUser(userId, "chat:message", { message: populatedAiLog });
          emitToRole("admin", "chat:message", { message: populatedAiLog });
          emitToRole("super_admin", "chat:message", { message: populatedAiLog });
        })
        .catch((error) => {
          console.error("AI chat reply failed", error.message);
        });
    }

    res.status(201).json({ success: true, message: populatedLog });
  } catch (error) {
    next(error);
  }
};
