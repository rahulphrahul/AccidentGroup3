import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ClockCounterClockwise, House, UserCircle } from "@phosphor-icons/react";
import {
  getChatMessages,
  getMyAccidentHistory,
  getMyNotifications,
  getMyResponses,
  markNotificationRead,
  sendChatMessage,
  submitSafetyResponse,
} from "../../service/apiservice";
import { connectSocket, disconnectSocket } from "../../service/socketService";
import { clearAuth, getStoredUser } from "../../utils/auth";
import "./UserDash.css";

const TABS = [
  { id: "home", label: "Home", icon: House },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "history", label: "History", icon: ClockCounterClockwise },
  { id: "profile", label: "Profile", icon: UserCircle },
];

const CitizenDashboard = () => {
  const user = useMemo(() => getStoredUser(), []);
  const navigate = useNavigate();
  const alarmRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [responses, setResponses] = useState([]);
  const [activePrompt, setActivePrompt] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatAccidentId, setChatAccidentId] = useState("");
  const [isListening, setIsListening] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    emergencyContact: localStorage.getItem("citizen_emergency_contact") || "",
    bloodGroup: localStorage.getItem("citizen_blood_group") || "",
  });

  const loadData = async () => {
    try {
      const [notiRes, historyRes, responseRes] = await Promise.all([
        getMyNotifications(),
        getMyAccidentHistory(),
        getMyResponses(),
      ]);
      setNotifications(notiRes.notifications || []);
      setHistory(historyRes.history || []);
      setResponses(responseRes.responses || []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    }
  };

  const appendChatMessage = (nextMessage) => {
    if (!nextMessage?._id) return;

    setChatMessages((prev) => {
      if (prev.some((messageItem) => messageItem._id === nextMessage._id)) return prev;
      return [...prev, nextMessage];
    });
  };

  const openSupportChat = (accidentId) => {
    if (!accidentId) return;
    setChatAccidentId(accidentId);
    setChatOpen(true);
  };

  const stopAlarm = () => {
    if (!alarmRef.current) return;

    const { audioContext, gainNode, oscillator } = alarmRef.current;

    try {
      gainNode?.gain.cancelScheduledValues(audioContext.currentTime);
      gainNode?.gain.setValueAtTime(0, audioContext.currentTime);
      oscillator?.stop();
      oscillator?.disconnect();
      gainNode?.disconnect();
      audioContext?.close();
    } catch {}

    alarmRef.current = null;
  };

  const startAlarm = async () => {
    if (alarmRef.current || typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const audioContext = new AudioContextClass();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.35);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.7);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 1.05);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.03);
      oscillator.start();

      alarmRef.current = { audioContext, oscillator, gainNode };
    } catch {}
  };

  useEffect(() => {
    loadData();

    const socket = connectSocket();

    socket.on("alert:accident", (payload) => {
      setNotifications((prev) => [
        {
          _id: `live-${Date.now()}`,
          type: "ACCIDENT_ALERT",
          message: `Accident ${payload.severity} detected nearby. Confirm safety now.`,
          isRead: false,
          accidentId: payload.accidentId,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setActiveTab("notifications");
    });

    socket.on("chatbot:trigger", (payload) => {
      setActivePrompt({ accidentId: payload.accidentId, startedAt: Date.now() });
    });

    socket.on("chatbot:timeout", (payload) => {
      setActivePrompt(null);
      setNotifications((prev) => [
        {
          _id: `timeout-${Date.now()}`,
          type: "SYSTEM",
          message: payload.message,
          isRead: false,
          accidentId: payload.accidentId,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      openSupportChat(payload.accidentId);
      loadData();
    });

    socket.on("chat:message", ({ message: nextMessage }) => {
      if (!nextMessage) return;

      const nextAccidentId =
        typeof nextMessage.accidentId === "string" ? nextMessage.accidentId : nextMessage.accidentId?._id;

      if (nextAccidentId) {
        setChatAccidentId((current) => current || nextAccidentId);
      }

      appendChatMessage(nextMessage);
      setChatOpen(true);
    });

    return () => {
      socket.off("alert:accident");
      socket.off("chatbot:trigger");
      socket.off("chatbot:timeout");
      socket.off("chat:message");
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (activePrompt) {
      startAlarm();
    } else {
      stopAlarm();
    }

    return () => stopAlarm();
  }, [activePrompt]);

  useEffect(() => {
    if (!chatOpen || !chatAccidentId) return;

    const loadChat = async () => {
      try {
        const data = await getChatMessages({ accidentId: chatAccidentId });
        setChatMessages(data.messages || []);
      } catch (err) {
        setError(err.message || "Failed to load support chat");
      }
    };

    loadChat();
  }, [chatOpen, chatAccidentId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const onSafetyResponse = async (responseType) => {
    if (!activePrompt) return;

    try {
      await submitSafetyResponse({
        accidentId: activePrompt.accidentId,
        responseType,
        responseTimeMs: Date.now() - activePrompt.startedAt,
      });
      setActivePrompt(null);

      if (responseType === "Help") {
        openSupportChat(activePrompt.accidentId);
      }

      setMessage(responseType === "Help" ? "Emergency response requested." : "Safety confirmed.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to submit response");
    }
  };

  const onMarkRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId ? { ...notification, isRead: true } : notification
        )
      );
    } catch (err) {
      setError(err.message || "Failed to mark notification");
    }
  };

  const onSendChat = async (nextMessage = chatInput) => {
    if (!chatAccidentId || !nextMessage.trim()) return;

    try {
      setError("");
      const data = await sendChatMessage({
        accidentId: chatAccidentId,
        message: nextMessage.trim(),
      });
      appendChatMessage(data.message);
      setChatInput("");
    } catch (err) {
      setError(err.message || "Failed to send chat message");
    }
  };

  const onShareCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSendChat(`My location is ${position.coords.latitude}, ${position.coords.longitude}`);
      },
      () => setError("Could not get current location.")
    );
  };

  const toggleVoiceInput = () => {
    const SpeechRecognitionClass =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognitionClass) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError("Voice input failed.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setChatInput(transcript);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const triggerSOS = async () => {
    try {
      setError("");
      const promptAccidentId = activePrompt?.accidentId;
      const latestAccidentFromHistory = history[0]?.accident?._id;
      const latestAccidentFromNotifications = notifications.find((notification) => notification.accidentId)?.accidentId;
      const accidentId = promptAccidentId || latestAccidentFromHistory || latestAccidentFromNotifications;

      if (!accidentId) {
        setError("No recent incident found. SOS can be sent when an alert is active.");
        return;
      }

      await submitSafetyResponse({
        accidentId,
        responseType: "Help",
        responseTimeMs: 0,
      });

      openSupportChat(accidentId);
      setMessage("SOS sent. Emergency unit will be dispatched.");
      setActiveTab("notifications");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not send SOS");
    }
  };

  const saveProfile = () => {
    localStorage.setItem("citizen_emergency_contact", profileForm.emergencyContact || "");
    localStorage.setItem("citizen_blood_group", profileForm.bloodGroup || "");
    setMessage("Profile preferences saved on this device.");
  };

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  const renderHome = () => (
    <>
      <section className="hero-card">
        <div>
          <h2>Stay Safe, {profileForm.name || "Citizen"}</h2>
          <p>Instant alerts, quick safety confirmation, and SOS dispatch in one tap.</p>
          <div className="hero-tags">
            <span className={locationEnabled ? "tag active" : "tag"}>
              Location {locationEnabled ? "On" : "Off"}
            </span>
            <span className="tag">Unread Alerts: {unreadCount}</span>
            <span className="tag">Responses: {responses.length}</span>
          </div>
        </div>
        <button className="sos-button" onClick={triggerSOS}>
          SOS
        </button>
      </section>

      <section className="grid-cards">
        <article className="app-card">
          <h3>Safety Actions</h3>
          <div className="quick-actions">
            <button onClick={() => setLocationEnabled((prev) => !prev)}>
              {locationEnabled ? "Disable Location" : "Enable Location"}
            </button>
            <button onClick={() => setActiveTab("notifications")}>Open Alerts</button>
            <button onClick={() => setActiveTab("history")}>View Incident History</button>
            <button onClick={() => setChatOpen(true)} disabled={!chatAccidentId}>
              Open Support Chat
            </button>
          </div>
        </article>

        <article className="app-card">
          <h3>Recent Activity</h3>
          <ul className="activity-list">
            {history.slice(0, 4).map((item) => (
              <li key={item.responseId}>
                <strong>{item.responseType}</strong>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </li>
            ))}
            {!history.length && <li>No activity yet</li>}
          </ul>
        </article>
      </section>
    </>
  );

  const renderNotifications = () => (
    <section className="app-card full">
      <h3>Notifications</h3>
      <ul className="notify-list">
        {notifications.map((notification) => (
          <li key={notification._id} className={notification.isRead ? "" : "unread"}>
            <div>
              <h4>{notification.type}</h4>
              <p>{notification.message}</p>
              <small>{new Date(notification.createdAt).toLocaleString()}</small>
            </div>
            <div className="notification-actions">
              {notification.accidentId && (
                <button onClick={() => openSupportChat(notification.accidentId)}>Open Chat</button>
              )}
              {!String(notification._id).startsWith("live-") &&
                !String(notification._id).startsWith("timeout-") &&
                !notification.isRead && (
                  <button onClick={() => onMarkRead(notification._id)}>Mark Read</button>
                )}
            </div>
          </li>
        ))}
        {!notifications.length && <li>No notifications</li>}
      </ul>
    </section>
  );

  const renderHistory = () => (
    <section className="app-card full">
      <h3>Incident History</h3>
      <div className="history-grid">
        {history.map((item) => (
          <article key={item.responseId} className="history-card">
            <header>
              <strong>{item.accident?.severity || "Unknown"} Incident</strong>
              <span>{item.accident?.status || "-"}</span>
            </header>
            <p>
              <b>Your Response:</b> {item.responseType}
            </p>
            <p>
              <b>Time:</b> {new Date(item.createdAt).toLocaleString()}
            </p>
            <p>
              <b>Location:</b> {item.accident?.location?.address || "Coordinates captured"}
            </p>
            {item.accident?._id && (
              <button onClick={() => openSupportChat(item.accident._id)}>Open Chat</button>
            )}
          </article>
        ))}
        {!history.length && <p>No incident history available.</p>}
      </div>
    </section>
  );

  const renderProfile = () => (
    <section className="app-card full">
      <h3>Profile & Emergency Details</h3>
      <div className="profile-grid">
        <label>
          Name
          <input
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
          />
        </label>
        <label>
          Email
          <input
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
          />
        </label>
        <label>
          Phone
          <input
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
          />
        </label>
        <label>
          Emergency Contact
          <input
            value={profileForm.emergencyContact}
            onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
          />
        </label>
        <label>
          Blood Group
          <input
            value={profileForm.bloodGroup}
            onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
            placeholder="e.g. O+"
          />
        </label>
      </div>
      <div className="profile-actions">
        <button onClick={saveProfile}>Save Preferences</button>
      </div>
    </section>
  );

  const renderSupportChat = () => (
    <div className="support-chat-modal">
      <div className="support-chat-card">
        <header className="support-chat-header">
          <div>
            <h3>Emergency Support Chat</h3>
            <p>Live chat with admin for this incident.</p>
          </div>
          <button className="support-chat-close" onClick={() => setChatOpen(false)}>
            Close
          </button>
        </header>

        <div className="quick-chat-actions">
          <button onClick={onShareCurrentLocation}>My location is - current location</button>
          <button onClick={() => onSendChat("I'm hit bad")}>I'm hit bad</button>
          <button onClick={() => onSendChat("I'm safe but need help")}>I'm safe but need help</button>
          <button onClick={() => onSendChat("Ambulance has not reached yet")}>
            Ambulance has not reached yet
          </button>
        </div>

        <div className="support-chat-body">
          {chatMessages.map((chat) => (
            <div
              key={chat._id}
              className={`chat-bubble ${chat.senderType === "user" ? "mine" : "theirs"}`}
            >
              <strong>
                {chat.senderType === "admin"
                  ? "Admin"
                  : chat.senderType === "system"
                    ? "System"
                    : "You"}
              </strong>
              <p>{chat.message}</p>
              <small>{new Date(chat.createdAt).toLocaleTimeString()}</small>
            </div>
          ))}
          {!chatMessages.length && <p className="muted">No chat messages yet.</p>}
        </div>

        <div className="support-chat-input">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Describe your condition or what help you need"
          />
          <button onClick={toggleVoiceInput}>{isListening ? "Listening..." : "Voice"}</button>
          <button onClick={() => onSendChat()}>Send</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="citizen-app">
      <aside className={drawerOpen ? "side-nav open" : "side-nav"}>
        <div className="drawer-header">
          <h2>Citizen App</h2>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
            x
          </button>
        </div>
        <div className="user-block">
          <div className="avatar">{(profileForm.name || "U").charAt(0).toUpperCase()}</div>
          <div>
            <strong>{profileForm.name || "Citizen"}</strong>
            <p>{profileForm.email}</p>
          </div>
        </div>
        <nav>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "menu active" : "menu"}
              onClick={() => {
                setActiveTab(tab.id);
                setDrawerOpen(false);
              }}
            >
              <span className="menu-icon">
                <tab.icon size={18} weight="duotone" />
              </span>
              {tab.label}
              {tab.id === "notifications" && unreadCount > 0 && <b className="count">{unreadCount}</b>}
            </button>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="main-view">
        <header className="top-head">
          <button className="menu-toggle" onClick={() => setDrawerOpen(true)}>
            Menu
          </button>
          <h1>{TABS.find((tab) => tab.id === activeTab)?.label}</h1>
          <button className="sos-mini" onClick={triggerSOS}>
            SOS
          </button>
        </header>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}

        {activeTab === "home" && renderHome()}
        {activeTab === "notifications" && renderNotifications()}
        {activeTab === "history" && renderHistory()}
        {activeTab === "profile" && renderProfile()}
      </main>

      <nav className="bottom-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>
              <tab.icon size={20} weight="duotone" />
            </span>
            <small>{tab.label}</small>
            {tab.id === "notifications" && unreadCount > 0 && <b className="dot">{unreadCount}</b>}
          </button>
        ))}
      </nav>

      {activePrompt && (
        <div className="chatbot-modal">
          <div className="chatbot-card">
            <h3>Safety Check</h3>
            <p>Accident detected nearby. Are you safe?</p>
            <p className="alarm-note">Alarm sounding. Respond to stop it.</p>
            <div className="actions">
              <button onClick={() => onSafetyResponse("Safe")}>I'm Safe</button>
              <button className="danger" onClick={() => onSafetyResponse("Help")}>
                Need Help
              </button>
            </div>
          </div>
        </div>
      )}

      {chatOpen && renderSupportChat()}
    </div>
  );
};

export default CitizenDashboard;
