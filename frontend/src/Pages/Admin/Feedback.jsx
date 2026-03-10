import React from "react";
import { NavLink } from "react-router-dom";
import "./Feedback.css";

const Feedback = () => {
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

        {/* Top Header */}
        <header className="top-header">
          <div>
            <h1>User Feedback</h1>
            <p className="subtitle">
              Review & manage user responses
            </p>
          </div>

          <button className="logout-btn">Logout</button>
        </header>

        {/* Filters */}
        <div className="feedback-filters">
          <input
            type="text"
            placeholder="Search feedback..."
            className="search-input"
          />

          <select className="filter-select">
            <option>All</option>
            <option>New</option>
            <option>Reviewed</option>
            <option>Resolved</option>
          </select>
        </div>

        {/* Feedback Cards */}
        <div className="feedback-grid">

          <div className="feedback-card">
            <div className="feedback-top">
              <h3>Rahul Sharma</h3>
              <span className="status new">New</span>
            </div>

            <p className="feedback-msg">
              Accident alert reached very fast. Impressive response time!
            </p>

            <div className="feedback-bottom">
              <span className="rating">⭐ 5.0</span>
              <span className="date">12 Jan 2026</span>
            </div>
          </div>

          <div className="feedback-card">
            <div className="feedback-top">
              <h3>Anjali Verma</h3>
              <span className="status reviewed">Reviewed</span>
            </div>

            <p className="feedback-msg">
              The app UI is good but live location tracking needs improvement.
            </p>

            <div className="feedback-bottom">
              <span className="rating">⭐ 4.0</span>
              <span className="date">10 Jan 2026</span>
            </div>
          </div>

          <div className="feedback-card">
            <div className="feedback-top">
              <h3>Rakesh Kumar</h3>
              <span className="status resolved">Resolved</span>
            </div>

            <p className="feedback-msg">
              Emergency contact feature was not working earlier but now fixed.
            </p>

            <div className="feedback-bottom">
              <span className="rating">⭐ 4.5</span>
              <span className="date">08 Jan 2026</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Feedback;