import React from "react";
import { NavLink } from "react-router-dom";
import "./Emergency.css";

const EmergencyServices = () => {
  const services = [
    {
      id: "EM001",
      type: "Ambulance",
      location: "NH-66 Highway",
      status: "Dispatched",
      eta: "8 mins",
    },
    {
      id: "EM002",
      type: "Police",
      location: "City Main Road",
      status: "On Route",
      eta: "5 mins",
    },
    {
      id: "EM003",
      type: "Hospital",
      location: "Apollo Hospital",
      status: "Pending",
      eta: "N/A",
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
          <h1>Emergency Services Management</h1>
        </header>

        {/* Service Cards */}
        <div className="emergency-grid">
          {services.map((service) => (
            <div key={service.id} className={`emergency-card ${service.type.toLowerCase()}`}>

              <div className="emergency-header">
                <h3>{service.type}</h3>
                <span className={`service-status ${service.status.toLowerCase()}`}>
                  {service.status}
                </span>
              </div>

              <p><strong>Location:</strong> {service.location}</p>
              <p><strong>ETA:</strong> {service.eta}</p>

              <div className="emergency-actions">
                <button className="track">Track</button>
                <button className="assign">Assign</button>
                <button className="cancel">Cancel</button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default EmergencyServices;
