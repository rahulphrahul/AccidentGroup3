import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptDispatch,
  completeDispatch,
  getMyAmbulance,
  getMyDispatches,
  registerAmbulance,
  rejectDispatch,
  updateAmbulanceLocation,
  updateAmbulanceStatus,
} from "../../service/apiservice";
import { connectSocket, disconnectSocket } from "../../service/socketService";
import { clearAuth, getStoredUser } from "../../utils/auth";
import "./AdminDashboard.css";
import "./Counselor.css";

const AMBULANCE_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "unit", label: "Unit Profile" },
  { id: "dispatches", label: "Dispatches" },
];

const AmbulanceDashboard = () => {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const [activeSection, setActiveSection] = useState("overview");
  const [ambulance, setAmbulance] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [form, setForm] = useState({ driverName: "", vehicleNumber: "", lat: "", lng: "" });
  const [locationForm, setLocationForm] = useState({ lat: "", lng: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [ambRes, disRes] = await Promise.all([getMyAmbulance(), getMyDispatches()]);
      const nextAmbulance = ambRes.ambulance || null;
      setAmbulance(nextAmbulance);
      setDispatches(disRes.dispatches || []);
      setLocationForm({
        lat: nextAmbulance?.location?.lat?.toString() || "",
        lng: nextAmbulance?.location?.lng?.toString() || "",
      });
    } catch (err) {
      setError(err.message || "Failed to load ambulance data");
    }
  }, []);

  useEffect(() => {
    load();
    const socket = connectSocket();
    const reload = () => load();
    socket.on("dispatch:assigned", reload);
    socket.on("dispatch:updated", reload);
    socket.on("dispatch:pending", reload);
    return () => {
      socket.off("dispatch:assigned", reload);
      socket.off("dispatch:updated", reload);
      socket.off("dispatch:pending", reload);
      disconnectSocket();
    };
  }, [load]);

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  const submitRegistration = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await registerAmbulance({
        driverName: form.driverName,
        vehicleNumber: form.vehicleNumber,
        location: { lat: Number(form.lat || 0), lng: Number(form.lng || 0) },
        availabilityStatus: "Offline",
      });
      setMessage("Ambulance unit registered successfully.");
      await load();
      setActiveSection("overview");
    } catch (err) {
      setError(err.message || "Registration failed");
    }
  };

  const updateStatus = async (status) => {
    try {
      setError("");
      setMessage("");
      await updateAmbulanceStatus(status);
      setMessage(`Status updated to ${status}.`);
      await load();
    } catch (err) {
      setError(err.message || "Could not update status");
    }
  };

  const submitLocationUpdate = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setMessage("");
      await updateAmbulanceLocation({
        lat: Number(locationForm.lat || 0),
        lng: Number(locationForm.lng || 0),
      });
      setMessage("Location updated.");
      await load();
    } catch (err) {
      setError(err.message || "Could not update location");
    }
  };

  const onAccept = async (dispatchId) => {
    try {
      setError("");
      setMessage("");
      await acceptDispatch(dispatchId);
      setMessage("Dispatch accepted.");
      await load();
    } catch (err) {
      setError(err.message || "Could not accept dispatch");
    }
  };

  const onReject = async (dispatchId) => {
    try {
      setError("");
      setMessage("");
      const reason = prompt("Reason for rejection", "Unit unavailable") || "Unit unavailable";
      await rejectDispatch(dispatchId, reason);
      setMessage("Dispatch rejected.");
      await load();
    } catch (err) {
      setError(err.message || "Could not reject dispatch");
    }
  };

  const onComplete = async (dispatchId) => {
    try {
      setError("");
      setMessage("");
      await completeDispatch(dispatchId);
      setMessage("Dispatch completed.");
      await load();
    } catch (err) {
      setError(err.message || "Could not complete dispatch");
    }
  };

  const dispatchMetrics = useMemo(() => {
    const assigned = dispatches.filter((item) => item.status === "Assigned").length;
    const accepted = dispatches.filter((item) => item.status === "Accepted").length;
    const completed = dispatches.filter((item) => item.status === "Completed").length;
    return {
      total: dispatches.length,
      assigned,
      accepted,
      completed,
    };
  }, [dispatches]);

  const renderSetup = () => (
    <article className="cc-card ambulance-setup">
      <h3>Ambulance Provider Setup</h3>
      <p className="muted">Register the unit once to unlock the provider dashboard.</p>
      <form className="cc-form" onSubmit={submitRegistration}>
        <input
          placeholder="Driver name"
          value={form.driverName}
          onChange={(e) => setForm({ ...form, driverName: e.target.value })}
          required
        />
        <input
          placeholder="Vehicle number"
          value={form.vehicleNumber}
          onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
          required
        />
        <input
          placeholder="Latitude"
          value={form.lat}
          onChange={(e) => setForm({ ...form, lat: e.target.value })}
        />
        <input
          placeholder="Longitude"
          value={form.lng}
          onChange={(e) => setForm({ ...form, lng: e.target.value })}
        />
        <button type="submit">Register Ambulance Unit</button>
      </form>
    </article>
  );

  const renderOverview = () => (
    <div className="cc-grid">
      <article className="cc-card metric">
        <h3>Unit Status</h3>
        <p>{ambulance?.availabilityStatus || "Offline"}</p>
        <small>Current operating state</small>
      </article>
      <article className="cc-card metric">
        <h3>Verification</h3>
        <p>{ambulance?.verificationStatus || "Pending"}</p>
        <small>Provider approval state</small>
      </article>
      <article className="cc-card metric">
        <h3>Total Dispatches</h3>
        <p>{dispatchMetrics.total}</p>
        <small>All requests assigned to this unit</small>
      </article>
      <article className="cc-card metric">
        <h3>Assigned</h3>
        <p>{dispatchMetrics.assigned}</p>
        <small>Awaiting response</small>
      </article>
      <article className="cc-card metric">
        <h3>Accepted</h3>
        <p>{dispatchMetrics.accepted}</p>
        <small>Currently in progress</small>
      </article>
      <article className="cc-card metric">
        <h3>Completed</h3>
        <p>{dispatchMetrics.completed}</p>
        <small>Resolved dispatches</small>
      </article>
    </div>
  );

  const renderUnit = () => (
    <>
      <article className="cc-card ambulance-profile">
        <h3>Unit Profile</h3>
        <div className="cc-grid ambulance-profile-grid">
          <div>
            <strong>Driver</strong>
            <p>{ambulance?.driverName || "-"}</p>
          </div>
          <div>
            <strong>Vehicle</strong>
            <p>{ambulance?.vehicleNumber || "-"}</p>
          </div>
          <div>
            <strong>Verification</strong>
            <p>{ambulance?.verificationStatus || "-"}</p>
          </div>
          <div>
            <strong>Status</strong>
            <p>{ambulance?.availabilityStatus || "-"}</p>
          </div>
        </div>
        <div className="row-actions">
          <button onClick={() => updateStatus("Available")}>Available</button>
          <button onClick={() => updateStatus("Busy")}>Busy</button>
          <button onClick={() => updateStatus("Offline")}>Offline</button>
        </div>
      </article>

      <article className="cc-card">
        <h3>Update Unit Location</h3>
        <form className="cc-form" onSubmit={submitLocationUpdate}>
          <input
            placeholder="Latitude"
            value={locationForm.lat}
            onChange={(e) => setLocationForm({ ...locationForm, lat: e.target.value })}
          />
          <input
            placeholder="Longitude"
            value={locationForm.lng}
            onChange={(e) => setLocationForm({ ...locationForm, lng: e.target.value })}
          />
          <button type="submit">Save Location</button>
        </form>
      </article>
    </>
  );

  const renderDispatches = () => (
    <article className="cc-card">
      <h3>Dispatch Requests</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Assigned</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Address</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {dispatches.length === 0 && (
              <tr>
                <td colSpan="5" className="muted">
                  No dispatches assigned yet.
                </td>
              </tr>
            )}
            {dispatches.map((dispatch) => (
              <tr key={dispatch._id}>
                <td>{dispatch.assignedTime ? new Date(dispatch.assignedTime).toLocaleString() : "-"}</td>
                <td>{dispatch.status}</td>
                <td>{dispatch.accidentId?.severity || "-"}</td>
                <td>{dispatch.accidentId?.location?.address || "-"}</td>
                <td>
                  <div className="row-actions compact-actions">
                    {dispatch.status === "Assigned" && (
                      <>
                        <button onClick={() => onAccept(dispatch._id)}>Accept</button>
                        <button className="secondary" onClick={() => onReject(dispatch._id)}>
                          Reject
                        </button>
                      </>
                    )}
                    {dispatch.status === "Accepted" && (
                      <button onClick={() => onComplete(dispatch._id)}>Complete</button>
                    )}
                    {!["Assigned", "Accepted"].includes(dispatch.status) && (
                      <span className="muted">No action</span>
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

  const renderContent = () => {
    if (!ambulance) return renderSetup();
    if (activeSection === "unit") return renderUnit();
    if (activeSection === "dispatches") return renderDispatches();
    return (
      <>
        {renderOverview()}
        {renderUnit()}
        {renderDispatches()}
      </>
    );
  };

  return (
    <div className="control-center ambulance-center">
      <aside className="cc-sidebar">
        <div className="brand">
          <h2>Ambulance Desk</h2>
          <p>{ambulance ? "Provider operations dashboard" : "Complete setup to start receiving dispatches"}</p>
        </div>

        {ambulance && (
          <nav>
            {AMBULANCE_SECTIONS.map((section) => (
              <button
                key={section.id}
                className={`nav-btn ${activeSection === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        )}
      </aside>

      <main className="cc-main">
        <header className="cc-topbar ambulance-topbar">
          <div>
            <h1>{ambulance ? "Ambulance Dashboard" : "Ambulance Provider Setup"}</h1>
            <p>
              {user?.name} ({user?.email})
            </p>
          </div>
          <button className="logout" onClick={logout}>
            Logout
          </button>
        </header>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}
        {renderContent()}
      </main>
    </div>
  );
};

export default AmbulanceDashboard;
