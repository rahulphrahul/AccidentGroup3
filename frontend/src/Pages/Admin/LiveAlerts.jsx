import React from "react";
import { NavLink } from "react-router-dom";
import "./LiveAlerts.css";

const LiveAlerts = () => {
  const alerts = [
    {
      id: "LA001",
      location: "NH-66 Highway",
      severity: "Critical",
      time: "2 mins ago",
      status: "Active",
    },
    {
      id: "LA002",
      location: "City Main Road",
      severity: "Moderate",
      time: "10 mins ago",
      status: "Acknowledged",
    },
    {
      id: "LA003",
      location: "Bypass Junction",
      severity: "Severe",
      time: "25 mins ago",
      status: "Active",
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
          <h1>Live Accident Alerts</h1>
        </header>

        {/* Alerts Grid */}
        <div className="alerts-grid">
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert-card ${alert.severity.toLowerCase()}`}>
              
              <div className="alert-header">
                <h3>{alert.location}</h3>
                <span className={`severity ${alert.severity.toLowerCase()}`}>
                  {alert.severity}
                </span>
              </div>

              <p className="alert-time">⏱ {alert.time}</p>

              <p className={`alert-status ${alert.status.toLowerCase()}`}>
                Status: {alert.status}
              </p>

              <div className="alert-actions">
                <button className="view">View</button>
                <button className="ack">Acknowledge</button>
                <button className="resolve">Resolve</button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default LiveAlerts;