import React from "react";
import { NavLink,useNavigate } from "react-router-dom";
import "./Mlprediction.css";

const MLPredictions = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="admin-layout">

      {/* ================= Sidebar ================= */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Admin</h2>
          <h3>Dashboard</h3>
        </div>

        <ul className="nav-list">

          <NavLink to="/RegUser" className="nav-item">
            <li>Registered Users</li>
          </NavLink>

          <NavLink to="/AccidentReport" className="nav-item">
            <li>Accident Reports</li>
          </NavLink>

          <NavLink to="/LiveAlerts" className="nav-item">
            <li>Live Alerts</li>
          </NavLink>

          <NavLink to="/Emergency" className="nav-item">
            <li>Emergency Services</li>
          </NavLink>

          <NavLink to="/Mlprediction" className="nav-item">
            <li>ML Predictions</li>
          </NavLink>

          {/* ✅ Counselor option added */}
          <NavLink to="/Counselor" className="nav-item">
            <li>Counselor Management</li>
          </NavLink>

          <NavLink to="/Feedback" className="nav-item">
            <li>Feedback</li>
          </NavLink>

          <NavLink to="/Settings" className="nav-item">
            <li>Settings</li>
          </NavLink>
        </ul>
      </aside>

      {/* ================= Main Content ================= */}
      <div className="main-content">

        {/* Header */}
        <header className="settings-header">
          <div>
            <h1>ML Predictions</h1>
            <p className="subtitle">
              AI-based Accident Risk & Severity Forecast
            </p>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        {/* ================= ORIGINAL CONTENT ================= */}

        {/* Top Stats */}
        <section className="stats-grid">
          <div className="stat-card highlight">
            <h3>Accident Risk</h3>
            <p className="stat-number">87%</p>
            <span className="stat-info">High Probability</span>
          </div>

          <div className="stat-card">
            <h3>Predicted Severity</h3>
            <p className="stat-number">Severe</p>
            <span className="stat-info">Impact Estimation</span>
          </div>

          <div className="stat-card">
            <h3>Model Accuracy</h3>
            <p className="stat-number">94%</p>
            <span className="stat-info">YOLO + CNN</span>
          </div>

          <div className="stat-card">
            <h3>Prediction Time</h3>
            <p className="stat-number">1.2s</p>
            <span className="stat-info">Real-time Inference</span>
          </div>
        </section>

        {/* Middle Section */}
        <section className="middle-grid">
          <div className="card">
            <h3>Accident Risk Trend</h3>
            <p className="card-sub">Last 24 Hours</p>
            <div className="graph-placeholder line">
              📉 Line Graph – Risk vs Time
            </div>
          </div>

          <div className="card">
            <h3>Severity Distribution</h3>
            <div className="graph-placeholder pie">
              🥧 Pie Chart – Minor / Moderate / Severe
            </div>
          </div>
        </section>

        {/* Bottom Section */}
        <section className="bottom-grid">
          <div className="card">
            <h3>Risk Probability Analysis</h3>
            <div className="graph-placeholder bar">
              📊 Bar Graph – Low / Medium / High Risk
            </div>
          </div>

          <div className="card">
            <h3>ML Decision Summary</h3>
            <ul className="ml-summary">
              <li>📍 Location Type: Highway</li>
              <li>🚗 Vehicle Speed: High</li>
              <li>🌧 Weather Condition: Rainy</li>
              <li>🛣 Road Surface: Wet</li>
              <li>⚠️ Final Prediction: Accident Likely</li>
            </ul>
          </div>
        </section>

        {/* Table Section */}
        <section className="card">
          <h3>Recent ML Predictions</h3>

          <table className="ml-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Risk</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>NH-66 Highway</td>
                <td className="risk-high">High</td>
                <td>Severe</td>
                <td>96%</td>
                <td>2 mins ago</td>
              </tr>
              <tr>
                <td>City Main Road</td>
                <td className="risk-medium">Medium</td>
                <td>Moderate</td>
                <td>84%</td>
                <td>12 mins ago</td>
              </tr>
              <tr>
                <td>Residential Area</td>
                <td className="risk-low">Low</td>
                <td>Minor</td>
                <td>72%</td>
                <td>30 mins ago</td>
              </tr>
            </tbody>
          </table>
        </section>

      </div>
    </div>
  );
};

export default MLPredictions;