import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  analyzeEmulationImage,
  cancelAccident,
  createEmulation,
  getAdminAccidents,
  getAdminDispatchLogs,
  getAdminOverview,
  getAllUsers,
  getChatConversations,
  getChatMessages,
  getEmulations,
  getPendingEmulations,
  getSuperConfig,
  manualDispatch,
  reviewEmulation,
  sendChatMessage,
  updateSuperConfig,
  updateUser,
  verifyAmbulance,
  verifyAmbulanceByUser,
} from "../../service/apiservice";
import { connectSocket, disconnectSocket } from "../../service/socketService";
import { clearAuth, getStoredUser } from "../../utils/auth";
import "./AdminDashboard.css";

const ADMIN_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "emulations", label: "Emulations" },
  { id: "accidents", label: "Accident History" },
  { id: "dispatches", label: "Dispatch Logs" },
  { id: "users", label: "Users" },
  { id: "chat", label: "Chat History" },
];

const SUPER_SECTIONS = [
  ...ADMIN_SECTIONS,
  { id: "approvals", label: "Approvals" },
  { id: "settings", label: "Settings" },
];

const defaultForm = {
  latitude: "12.9716",
  longitude: "77.5946",
  severity: "High",
  confidenceScore: "0.92",
  cameraId: "",
  address: "",
};

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const isSuper = user?.role === "super_admin";

  const sections = isSuper ? SUPER_SECTIONS : ADMIN_SECTIONS;
  const [activeSection, setActiveSection] = useState("overview");

  const [overview, setOverview] = useState(null);
  const [accidents, setAccidents] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [chatConversations, setChatConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [adminChatInput, setAdminChatInput] = useState("");
  const [emulations, setEmulations] = useState([]);
  const [pendingEmulations, setPendingEmulations] = useState([]);
  const [timeout, setTimeoutValue] = useState(60);
  const [form, setForm] = useState(defaultForm);
  const [analysisImage, setAnalysisImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dispatchingAccidentId, setDispatchingAccidentId] = useState("");
  const activeConversationRef = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      setError("");
      const requests = [
        getAdminOverview(),
        getAdminAccidents(),
        getAdminDispatchLogs(),
        getAllUsers(),
        getChatConversations(),
        getEmulations(),
      ];

      if (isSuper) {
        requests.push(getPendingEmulations(), getSuperConfig());
      }

      const [ov, ac, ds, us, chat, em, pen, cfg] = await Promise.all(requests);

      setOverview(ov.overview || null);
      setAccidents(ac.accidents || []);
      setDispatches(ds.logs || []);
      setUsers(us.users || []);
      setChatConversations(chat.conversations || []);
      setEmulations(em.emulations || []);

      if (isSuper) {
        setPendingEmulations(pen?.emulations || []);
        setTimeoutValue(cfg?.config?.responseTimeoutSeconds || 60);
      }
    } catch (err) {
      setError(err.message || "Failed to load control center data");
    }
  }, [isSuper]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    loadAll();

    const socket = connectSocket();
    const reload = () => loadAll();

    socket.on("accident:new", reload);
    socket.on("dispatch:updated", reload);
    socket.on("dispatch:pending", reload);
    socket.on("response:received", reload);
    socket.on("emulation:new", reload);
    socket.on("emulation:reviewed", reload);
    socket.on("chat:message", ({ message: nextMessage }) => {
      const nextAccidentId =
        typeof nextMessage?.accidentId === "string"
          ? nextMessage.accidentId
          : nextMessage?.accidentId?._id;
      const nextUserId =
        typeof nextMessage?.userId === "string" ? nextMessage.userId : nextMessage?.userId?._id;
      const nextConversation = {
        userId: nextUserId,
        accidentId: nextAccidentId,
        latestMessage: nextMessage?.message || "",
        latestSenderType: nextMessage?.senderType || "",
        latestResponseType: nextMessage?.responseType || "",
        latestCreatedAt: nextMessage?.createdAt || new Date().toISOString(),
        user: nextMessage?.userId || null,
        accident: nextMessage?.accidentId || null,
      };

      setChatConversations((prev) => {
        const filtered = prev.filter(
          (conversation) =>
            !(
              normalizeId(conversation.userId) === normalizeId(nextConversation.userId) &&
              normalizeId(conversation.accidentId) === normalizeId(nextConversation.accidentId)
            )
        );

        return [nextConversation, ...filtered];
      });

      if (
        activeConversationRef.current &&
        normalizeId(activeConversationRef.current.accidentId) === normalizeId(nextAccidentId) &&
        normalizeId(activeConversationRef.current.userId) === normalizeId(nextUserId)
      ) {
        setChatMessages((prev) => {
          if (prev.some((item) => item._id === nextMessage._id)) return prev;
          return [...prev, nextMessage];
        });
      }
    });

    return () => {
      socket.off("accident:new", reload);
      socket.off("dispatch:updated", reload);
      socket.off("dispatch:pending", reload);
      socket.off("response:received", reload);
      socket.off("emulation:new", reload);
      socket.off("emulation:reviewed", reload);
      socket.off("chat:message");
      disconnectSocket();
    };
  }, [loadAll]);

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  const onCreateEmulation = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setMessage("");
      await createEmulation({
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        severity: form.severity,
        confidenceScore: Number(form.confidenceScore),
        cameraId: form.cameraId,
        address: form.address,
        metadata: analysisResult ? { aiImageAnalysis: analysisResult } : undefined,
      });
      setMessage(isSuper ? "Emulation approved and triggered instantly." : "Emulation submitted for super admin approval.");
      setForm(defaultForm);
      setAnalysisImage(null);
      setAnalysisResult(null);
      loadAll();
    } catch (err) {
      setError(err.message || "Failed to create emulation");
    }
  };

  const onApproveReject = async (emulationId, action) => {
    try {
      const reason = action === "reject" ? prompt("Reason for rejection", "Insufficient confidence") || "Rejected" : "";
      await reviewEmulation(emulationId, action, reason);
      setMessage(`Emulation ${action}d successfully.`);
      loadAll();
    } catch (err) {
      setError(err.message || `Failed to ${action} emulation`);
    }
  };

  const onAnalyzeImage = async () => {
    if (!analysisImage) {
      setError("Choose an image before running AI analysis.");
      return;
    }

    try {
      setAnalysisLoading(true);
      setError("");
      setMessage("");
      const data = await analyzeEmulationImage(analysisImage, {
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address,
        cameraId: form.cameraId,
      });

      setAnalysisResult(data.analysis || null);

      if (data.analysis?.severity) {
        setForm((prev) => ({
          ...prev,
          severity: data.analysis.severity,
          confidenceScore: String(data.analysis.confidenceScore ?? prev.confidenceScore),
        }));
      }

      setMessage(`Image analyzed using ${data.analysis?.provider || "AI service"}.`);
    } catch (err) {
      setError(err.message || "Failed to analyze image");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const onCancelAccident = async (accidentId) => {
    try {
      setError("");
      setMessage("");
      await cancelAccident(accidentId);
      setMessage("Accident cancelled successfully.");
      loadAll();
    } catch (err) {
      setError(err.message || "Could not cancel accident");
    }
  };

  const onManualDispatch = async (accidentId) => {
    try {
      setDispatchingAccidentId(accidentId);
      setError("");
      setMessage("");
      const response = await manualDispatch(accidentId, "Manual dispatch from control center");
      const dispatch = response.dispatch;

      if (!dispatch) {
        setError("Dispatch could not be created for this accident.");
        return;
      }

      if (dispatch.status === "Assigned") {
        setMessage("Dispatch assigned to an ambulance. Opening dispatch logs.");
      } else if (dispatch.status === "Pending") {
        setMessage("No ambulance is currently available. Dispatch was recorded as pending.");
      } else {
        setMessage(`Dispatch already exists with status ${dispatch.status}.`);
      }

      await loadAll();
      setActiveSection("dispatches");
    } catch (err) {
      setError(err.message || "Could not create dispatch");
    } finally {
      setDispatchingAccidentId("");
    }
  };

  const onRoleUpdate = async (userItem) => {
    const role = prompt("Set role: citizen / ambulance / admin / super_admin", userItem.role);
    if (!role) return;
    await updateUser(userItem._id, { role });
    loadAll();
  };

  const onVerifyAmbulance = async (userItem, verificationStatus) => {
    try {
      setError("");
      setMessage("");
      if (userItem.ambulanceProfile?._id) {
        await verifyAmbulance(userItem.ambulanceProfile._id, verificationStatus);
      } else {
        await verifyAmbulanceByUser(userItem._id, verificationStatus);
      }
      setMessage(`Ambulance ${verificationStatus.toLowerCase()} successfully.`);
      await loadAll();
    } catch (err) {
      setError(err.message || "Could not update ambulance verification");
    }
  };

  const onSaveSettings = async () => {
    try {
      await updateSuperConfig(Number(timeout));
      setMessage("Response timeout setting updated.");
      loadAll();
    } catch (err) {
      setError(err.message || "Could not update timeout setting");
    }
  };

  useEffect(() => {
    if (!chatConversations.length) return;

    if (!activeConversation) {
      setActiveConversation(chatConversations[0]);
      return;
    }

    const refreshed = chatConversations.find(
      (conversation) =>
        normalizeId(conversation.userId) === normalizeId(activeConversation.userId) &&
        normalizeId(conversation.accidentId) === normalizeId(activeConversation.accidentId)
    );

    if (refreshed) {
      setActiveConversation(refreshed);
    }
  }, [activeConversation, chatConversations]);

  useEffect(() => {
    if (!activeConversation) {
      setChatMessages([]);
      return;
    }

    const loadConversationMessages = async () => {
      try {
        setChatMessages([]);
        const data = await getChatMessages({
          accidentId: normalizeId(activeConversation.accidentId),
          userId: normalizeId(activeConversation.userId),
        });
        setChatMessages(data.messages || []);
      } catch (err) {
        setError(err.message || "Could not load chat messages");
      }
    };

    loadConversationMessages();
  }, [activeConversation]);

  const onSendAdminChatMessage = async () => {
    if (!activeConversation || !adminChatInput.trim()) return;

    try {
      setError("");
      const data = await sendChatMessage({
        accidentId: normalizeId(activeConversation.accidentId),
        userId: normalizeId(activeConversation.userId),
        message: adminChatInput.trim(),
      });
      setChatMessages((prev) => [...prev, data.message]);
      setAdminChatInput("");
      loadAll();
    } catch (err) {
      setError(err.message || "Could not send admin chat message");
    }
  };

  const latestDispatchByAccidentId = useMemo(() => {
    const dispatchMap = new Map();

    dispatches.forEach((dispatch) => {
      const accidentId =
        typeof dispatch.accidentId === "string" ? dispatch.accidentId : dispatch.accidentId?._id;

      if (accidentId && !dispatchMap.has(accidentId)) {
        dispatchMap.set(accidentId, dispatch);
      }
    });

    return dispatchMap;
  }, [dispatches]);

  const renderOverview = () => (
    <div className="cc-grid">
      <article className="cc-card metric"><h3>Total Users</h3><p>{overview?.users ?? 0}</p><small>All registered roles</small></article>
      <article className="cc-card metric"><h3>Citizens</h3><p>{overview?.citizens ?? 0}</p><small>Public users</small></article>
      <article className="cc-card metric"><h3>Ambulance Providers</h3><p>{overview?.ambulanceProviders ?? 0}</p><small>Service operators</small></article>
      <article className="cc-card metric"><h3>Total Accidents</h3><p>{overview?.accidents ?? 0}</p><small>Recorded incidents</small></article>
      <article className="cc-card metric"><h3>Pending Accidents</h3><p>{overview?.pendingAccidents ?? 0}</p><small>Unresolved incidents</small></article>
      <article className="cc-card metric"><h3>Active Dispatches</h3><p>{overview?.activeDispatches ?? 0}</p><small>Assigned/Accepted</small></article>
      <article className="cc-card metric"><h3>No Responses</h3><p>{overview?.unresolvedResponses ?? 0}</p><small>Auto escalation candidates</small></article>
      <article className="cc-card metric"><h3>Pending Emulations</h3><p>{overview?.pendingEmulations ?? 0}</p><small>Awaiting verification</small></article>
    </div>
  );

  const renderEmulations = () => (
    <>
      <article className="cc-card">
        <h3>Generate Accident Emulation</h3>
        <p className="muted">Admins submit emulations for super-admin approval. Super-admin can auto-approve their own emulations.</p>
        <form className="cc-form" onSubmit={onCreateEmulation}>
          <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="Latitude" required />
          <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="Longitude" required />
          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
          <input value={form.confidenceScore} onChange={(e) => setForm({ ...form, confidenceScore: e.target.value })} placeholder="Confidence 0-1" required />
          <input value={form.cameraId} onChange={(e) => setForm({ ...form, cameraId: e.target.value })} placeholder="Camera ID" />
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address (optional)" />
          <input type="file" accept="image/*" onChange={(e) => setAnalysisImage(e.target.files?.[0] || null)} />
          <button type="button" className="secondary" onClick={onAnalyzeImage} disabled={analysisLoading}>
            {analysisLoading ? "Analyzing..." : "Analyze Image"}
          </button>
          <button type="submit">Submit Emulation</button>
        </form>
        {analysisResult && (
          <div className="analysis-card">
            <h4>AI Suggestion</h4>
            <p><strong>Provider:</strong> {analysisResult.provider}</p>
            <p><strong>Severity:</strong> {analysisResult.severity}</p>
            <p><strong>Confidence:</strong> {Math.round((analysisResult.confidenceScore || 0) * 100)}%</p>
            <p><strong>Summary:</strong> {analysisResult.summary}</p>
          </div>
        )}
      </article>

      <article className="cc-card">
        <h3>Emulation History</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Created</th><th>Severity</th><th>Status</th><th>Confidence</th><th>Reviewer</th><th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {emulations.map((row) => (
                <tr key={row._id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{row.payload?.severity}</td>
                  <td><span className={`badge ${row.status}`}>{row.status}</span></td>
                  <td>{Math.round((row.payload?.confidenceScore || 0) * 100)}%</td>
                  <td>{row.reviewedBy?.name || "-"}</td>
                  <td>{row.rejectionReason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );

  const renderApprovals = () => (
    <article className="cc-card">
      <h3>Pending Approval Queue</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Submitted</th><th>By</th><th>Location</th><th>Severity</th><th>Confidence</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingEmulations.map((row) => (
              <tr key={row._id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>{row.createdBy?.name} ({row.createdBy?.email})</td>
                <td>{row.payload?.latitude}, {row.payload?.longitude}</td>
                <td>{row.payload?.severity}</td>
                <td>{Math.round((row.payload?.confidenceScore || 0) * 100)}%</td>
                <td>
                  <button onClick={() => onApproveReject(row._id, "approve")}>Approve</button>
                  <button className="secondary" onClick={() => onApproveReject(row._id, "reject")}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );

  const renderAccidents = () => (
    <article className="cc-card">
      <h3>Accident History</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Time</th><th>Severity</th><th>Status</th><th>Location</th><th>Dispatch</th><th>Action</th></tr>
          </thead>
          <tbody>
            {accidents.map((acc) => (
              (() => {
                const relatedDispatch = latestDispatchByAccidentId.get(acc._id);
                const canDispatch =
                  acc.status === "Pending" &&
                  !["Assigned", "Accepted", "Pending"].includes(relatedDispatch?.status || "");

                return (
                  <tr key={acc._id}>
                    <td>{new Date(acc.createdAt).toLocaleString()}</td>
                    <td>{acc.severity}</td>
                    <td>{acc.status}</td>
                    <td>{acc.location?.coordinates?.[1]}, {acc.location?.coordinates?.[0]}</td>
                    <td>{relatedDispatch?.status || "Not dispatched"}</td>
                    <td>
                      <button
                        onClick={() => onManualDispatch(acc._id)}
                        disabled={!canDispatch || dispatchingAccidentId === acc._id}
                        title={
                          canDispatch
                            ? "Create a manual dispatch"
                            : relatedDispatch?.status
                              ? `Dispatch already ${relatedDispatch.status.toLowerCase()}`
                              : `Cannot dispatch a ${acc.status.toLowerCase()} accident`
                        }
                      >
                        {dispatchingAccidentId === acc._id ? "Dispatching..." : "Dispatch"}
                      </button>
                      {acc.status !== "Cancelled" && (
                        <button className="secondary" onClick={() => onCancelAccident(acc._id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })()
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );

  const renderDispatches = () => (
    <article className="cc-card">
      <h3>Dispatch Logs</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Assigned</th><th>Status</th><th>Ambulance</th><th>Reason</th></tr>
          </thead>
          <tbody>
            {dispatches.map((row) => (
              <tr key={row._id}>
                <td>{new Date(row.assignedTime).toLocaleString()}</td>
                <td>{row.status}</td>
                <td>{row.ambulanceId?.vehicleNumber || "-"}</td>
                <td>{row.reason || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );

  const renderUsers = () => (
    <article className="cc-card">
      <h3>User Management</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Online</th><th>Ambulance Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td>{u.role}</td>
                <td>{u.online ? "Online" : "Offline"}</td>
                <td>
                  {u.role === "ambulance" ? (
                    <div className="ambulance-status-block">
                      <div>Verification: {u.ambulanceProfile?.verificationStatus || "Not registered"}</div>
                      <div>Availability: {u.ambulanceProfile?.availabilityStatus || "-"}</div>
                      <div>Vehicle: {u.ambulanceProfile?.vehicleNumber || "-"}</div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <div className="action-group">
                    <button onClick={() => onRoleUpdate(u)}>Change Role</button>
                  {u.role === "ambulance" && (
                    <>
                      <button
                        onClick={() => onVerifyAmbulance(u, "Approved")}
                        disabled={u.ambulanceProfile?.verificationStatus === "Approved"}
                        title={
                          u.ambulanceProfile
                            ? "Approve this ambulance provider"
                            : "Approve this ambulance provider"
                        }
                      >
                        Approve Ambulance
                      </button>
                      <button
                        className="secondary"
                        onClick={() => onVerifyAmbulance(u, "Rejected")}
                        disabled={u.ambulanceProfile?.verificationStatus === "Rejected"}
                        title={
                          u.ambulanceProfile
                            ? "Reject this ambulance provider"
                            : "Reject this ambulance provider"
                        }
                      >
                        Reject Ambulance
                      </button>
                    </>
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );

  const renderChat = () => (
    <article className="cc-card">
      <h3>Citizen Support Chat</h3>
      <p className="muted">Latest conversations are listed first. Select a citizen to open the live thread.</p>
      <div className="chat-layout">
        <div className="chat-conversation-list">
          {chatConversations.map((conversation) => (
            <button
              key={`${conversation.userId}-${conversation.accidentId}`}
              className={
                activeConversation &&
                normalizeId(activeConversation.userId) === normalizeId(conversation.userId) &&
                normalizeId(activeConversation.accidentId) === normalizeId(conversation.accidentId)
                  ? "chat-thread-card active"
                  : "chat-thread-card"
              }
              onClick={() => {
                setAdminChatInput("");
                setError("");
                setActiveConversation(conversation);
              }}
            >
              <span className="chat-thread-accent" />
              <div className="chat-thread-top">
                <strong>{conversation.user?.name || "Citizen"}</strong>
                <small>{new Date(conversation.latestCreatedAt).toLocaleString()}</small>
              </div>
              <span className="chat-thread-email">{conversation.user?.email || "-"}</span>
              <div className="chat-thread-meta">
                <span className={`chat-severity ${String(conversation.accident?.severity || "unknown").toLowerCase()}`}>
                  {conversation.accident?.severity || "Unknown"}
                </span>
                <span className="chat-sender-tag">{conversation.latestSenderType}</span>
              </div>
              <p>{conversation.latestMessage}</p>
            </button>
          ))}
          {!chatConversations.length && <p className="muted">No citizen conversations yet.</p>}
        </div>

        <div className="chat-thread-panel">
          {activeConversation ? (
            <>
              <div className="chat-thread-header">
                <div>
                  <h4>{activeConversation.user?.name || "Citizen"}</h4>
                  <p>
                    {activeConversation.user?.email || "-"} | Severity:{" "}
                    {activeConversation.accident?.severity || "-"}
                  </p>
                </div>
              </div>
              <div className="admin-chat-body">
                {chatMessages.map((chat) => (
                  <div
                    key={chat._id}
                    className={`admin-chat-bubble ${chat.senderType === "admin" ? "mine" : "theirs"}`}
                  >
                    <strong>
                      {chat.senderType === "admin"
                        ? "Admin"
                        : chat.senderType === "system"
                          ? "System"
                          : chat.userId?.name || "Citizen"}
                    </strong>
                    <p>{chat.message}</p>
                    <small>{new Date(chat.createdAt).toLocaleString()}</small>
                  </div>
                ))}
                {!chatMessages.length && <p className="muted">No messages in this conversation.</p>}
              </div>
              <div className="admin-chat-input">
                <input
                  value={adminChatInput}
                  onChange={(e) => setAdminChatInput(e.target.value)}
                  placeholder="Type a message to the citizen"
                />
                <button onClick={onSendAdminChatMessage}>Send</button>
              </div>
            </>
          ) : (
            <p className="muted">Select a citizen conversation to open the chat.</p>
          )}
        </div>
      </div>
    </article>
  );

  const renderSettings = () => (
    <article className="cc-card">
      <h3>System Settings</h3>
      <p className="muted">Configure response timeout used for automatic SOS escalation.</p>
      <div className="settings-box">
        <label htmlFor="timeout">Safety Response Timeout (seconds)</label>
        <input id="timeout" type="number" min="15" max="600" value={timeout} onChange={(e) => setTimeoutValue(e.target.value)} />
        <button onClick={onSaveSettings}>Save Settings</button>
      </div>
    </article>
  );

  return (
    <div className="control-center">
      <aside className="cc-sidebar">
        <div className="brand">
          <h2>{isSuper ? "Super Admin" : "Admin"}</h2>
          <p>Control Center</p>
        </div>
        <nav>
          {sections.map((item) => (
            <button
              key={item.id}
              className={activeSection === item.id ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="cc-main">
        <header className="cc-topbar">
          <div>
            <h1>Accident Response Management</h1>
            <p>{user?.name} | {isSuper ? "Super Admin" : "Admin"}</p>
          </div>
          <button className="logout" onClick={logout}>Logout</button>
        </header>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}

        {activeSection === "overview" && renderOverview()}
        {activeSection === "emulations" && renderEmulations()}
        {activeSection === "approvals" && isSuper && renderApprovals()}
        {activeSection === "accidents" && renderAccidents()}
        {activeSection === "dispatches" && renderDispatches()}
        {activeSection === "users" && renderUsers()}
        {activeSection === "chat" && renderChat()}
        {activeSection === "settings" && isSuper && renderSettings()}
      </main>
    </div>
  );
};

export default AdminDashboard;
