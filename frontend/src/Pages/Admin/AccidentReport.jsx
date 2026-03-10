import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./AccidentReport.css";

const AccidentReports = () => {
  const [search, setSearch] = useState("");

  const reports = [
    {
      id: "AR001",
      location: "NH-66 Highway",
      date: "2026-01-05",
      severity: "Critical",
      status: "Pending",
    },
    {
      id: "AR002",
      location: "City Main Road",
      date: "2026-01-04",
      severity: "Moderate",
      status: "Verified",
    },
    {
      id: "AR003",
      location: "Bypass Junction",
      date: "2026-01-03",
      severity: "Severe",
      status: "In Progress",
    },
  ];

  return (
    <div className="dashboard-container">

      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="brand">Accident Admin</h2>
      
          
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

      {/* Main Content */}
      <div className="content-area">

        {/* Header */}
        <header className="top-header">
          <h1>Accident Reports</h1>
        </header>

        {/* Search & Filter */}
        <div className="report-filters">
          <input
            type="text"
            placeholder="Search by Report ID or Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select>
            <option>All Severity</option>
            <option>Critical</option>
            <option>Severe</option>
            <option>Moderate</option>
            <option>Minor</option>
          </select>
          <button>Search</button>
        </div>

        {/* Reports Table */}
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Location</th>
                <th>Date</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.location}</td>
                  <td>{report.date}</td>
                  <td>
                    <span className={`severity ${report.severity.toLowerCase()}`}>
                      {report.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${report.status.toLowerCase().replace(" ", "-")}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="action-btns">
                    <button className="view">View</button>
                    <button className="verify">Verify</button>
                    <button className="delete">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>
    </div>
  );
};

export default AccidentReports;
