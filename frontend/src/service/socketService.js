const SOCKET_BASE = process.env.REACT_APP_SOCKET_BASE || "http://localhost:3001";

const createNoopSocket = () => ({
  connected: false,
  on: () => {},
  off: () => {},
  emit: () => {},
  disconnect: () => {},
});

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  const token = localStorage.getItem("token") || "";
  if (window.io) {
    socket = window.io(SOCKET_BASE, {
      transports: ["websocket"],
      auth: { token },
    });
  } else {
    socket = createNoopSocket();
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
