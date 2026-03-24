const ChatLog = require("../models/ChatLog");

exports.generateAIReply = async ({ accidentId, userId }) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

  const history = await ChatLog.find({ accidentId, userId })
    .sort({ createdAt: 1 })
    .limit(12)
    .lean();

  const response = await fetch(`${aiServiceUrl.replace(/\/+$/, "")}/chat-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accidentId: String(accidentId),
      userId: String(userId),
      history: history.map((item) => ({
        senderType: item.senderType,
        message: item.message,
        createdAt: item.createdAt,
      })),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.reply) {
    throw new Error(payload.detail || payload.message || "AI chat service failed");
  }

  return String(payload.reply).trim();
};
