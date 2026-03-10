import axios from "axios";
import { clearAuth, getToken, saveAuth } from "../utils/auth";

const RAW_BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:3001/api";
const trimmedBase = RAW_BASE_URL.replace(/\/+$/, "");
const BASE_URL = trimmedBase.includes("/api") ? trimmedBase : `${trimmedBase}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

if (process.env.NODE_ENV === "development") {
  // Helps verify which backend URL the browser is actually using.
  console.info("[api] baseURL:", BASE_URL);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) clearAuth();
    return Promise.reject(error.response?.data || { message: "Server error" });
  }
);

export const loginUser = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  if (data.token && data.user) saveAuth({ token: data.token, user: data.user });
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
};

export const registerUser = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  if (data.token && data.user) saveAuth({ token: data.token, user: data.user });
  return data;
};

export const fetchMe = async () => (await api.get("/auth/me")).data;

export const getMyNotifications = async (unreadOnly = false) =>
  (await api.get(`/notifications/me?unreadOnly=${unreadOnly}`)).data;

export const markNotificationRead = async (notificationId) =>
  (await api.patch(`/notifications/${notificationId}/read`)).data;

export const submitSafetyResponse = async (payload) =>
  (await api.post("/responses", payload)).data;

export const getMyResponses = async () => (await api.get("/responses/me")).data;

export const getMyAccidentHistory = async () => (await api.get("/accidents/my-history")).data;

export const registerAmbulance = async (payload) =>
  (await api.post("/ambulances/register", payload)).data;

export const getMyAmbulance = async () => (await api.get("/ambulances/me")).data;

export const updateAmbulanceStatus = async (availabilityStatus) =>
  (await api.patch("/ambulances/me/status", { availabilityStatus })).data;

export const updateAmbulanceLocation = async (location) =>
  (await api.patch("/ambulances/me/location", { location })).data;

export const getMyDispatches = async () => (await api.get("/ambulances/dispatches")).data;

export const acceptDispatch = async (dispatchId) =>
  (await api.post(`/ambulances/dispatches/${dispatchId}/accept`)).data;

export const rejectDispatch = async (dispatchId, reason) =>
  (await api.post(`/ambulances/dispatches/${dispatchId}/reject`, { reason })).data;

export const completeDispatch = async (dispatchId) =>
  (await api.post(`/ambulances/dispatches/${dispatchId}/complete`)).data;

export const getAdminOverview = async () => (await api.get("/admin/overview")).data;

export const getAdminAccidents = async () => (await api.get("/admin/accidents")).data;

export const getAdminDispatchLogs = async () => (await api.get("/admin/dispatch-logs")).data;

export const cancelAccident = async (accidentId) =>
  (await api.post(`/admin/accidents/${accidentId}/cancel`)).data;

export const manualDispatch = async (accidentId, reason) =>
  (await api.post(`/admin/accidents/${accidentId}/manual-dispatch`, { reason })).data;

export const getAllUsers = async () => (await api.get("/admin/users")).data;

export const updateUser = async (userId, payload) =>
  (await api.put(`/admin/users/${userId}`, payload)).data;

export const deleteUser = async (userId) => (await api.delete(`/admin/users/${userId}`)).data;

export const verifyAmbulance = async (ambulanceId, verificationStatus) =>
  (await api.patch(`/admin/ambulances/${ambulanceId}/verify`, { verificationStatus })).data;

export const verifyAmbulanceByUser = async (userId, verificationStatus) =>
  (await api.patch(`/admin/users/${userId}/ambulance-verify`, { verificationStatus })).data;

export const getSuperConfig = async () => (await api.get("/super-admin/config")).data;

export const updateSuperConfig = async (responseTimeoutSeconds) =>
  (await api.put("/super-admin/config", { responseTimeoutSeconds })).data;

export const createEmulation = async (payload) =>
  (await api.post("/admin/emulations", payload)).data;

export const analyzeEmulationImage = async (file, payload = {}) => {
  const formData = new FormData();
  formData.append("image", file);
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value ?? "");
  });

  const { data } = await api.post("/admin/emulations/analyze-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const getEmulations = async () => (await api.get("/admin/emulations")).data;

export const getChatLogs = async () => (await api.get("/admin/chat-logs")).data;

export const getChatConversations = async () => (await api.get("/chat/conversations")).data;

export const getChatMessages = async ({ accidentId, userId } = {}) =>
  (
    await api.get("/chat/messages", {
      params: {
        ...(accidentId ? { accidentId } : {}),
        ...(userId ? { userId } : {}),
      },
    })
  ).data;

export const sendChatMessage = async (payload) => (await api.post("/chat/messages", payload)).data;

export const getPendingEmulations = async () => (await api.get("/super-admin/emulations/pending")).data;

export const reviewEmulation = async (emulationId, action, rejectionReason = "") =>
  (await api.post(`/super-admin/emulations/${emulationId}/review`, { action, rejectionReason })).data;

export const sendDetectionEvent = async (payload, detectionKey) =>
  (
    await api.post("/accidents/events", payload, {
      headers: detectionKey ? { "x-detection-key": detectionKey } : {},
    })
  ).data;

export default api;
