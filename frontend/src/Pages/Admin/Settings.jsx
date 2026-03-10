import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSuperConfig, updateSuperConfig } from "../../service/apiservice";
import { clearAuth } from "../../utils/auth";
import "./Settings.css";

const Settings = () => {
  const navigate = useNavigate();
  const [timeout, setTimeoutValue] = useState(60);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await getSuperConfig();
      setTimeoutValue(data.config.responseTimeoutSeconds);
    } catch (err) {
      setError(err.message || "Failed to load config");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setError("");
    setMessage("");
    try {
      const data = await updateSuperConfig(Number(timeout));
      setTimeoutValue(data.config.responseTimeoutSeconds);
      setMessage("Configuration updated");
    } catch (err) {
      setError(err.message || "Failed to update config");
    }
  };

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="settings-page">
      <header>
        <h1>Super Admin Configuration</h1>
        <div>
          <button onClick={() => navigate("/admin")}>Back to Admin</button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="settings-card">
        <h3>Safety Response Timeout</h3>
        <p>Controls automatic No Response escalation and dispatch trigger window.</p>
        <input type="number" min="15" max="600" value={timeout} onChange={(e) => setTimeoutValue(e.target.value)} />
        <button onClick={save}>Save Timeout (seconds)</button>
      </section>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default Settings;
