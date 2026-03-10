let ioInstance = null;

exports.setIo = (io) => {
  ioInstance = io;
};

exports.getIo = () => ioInstance;

exports.emitToUser = (userId, eventName, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`user:${String(userId)}`).emit(eventName, payload);
};

exports.emitToRole = (role, eventName, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`role:${role}`).emit(eventName, payload);
};
