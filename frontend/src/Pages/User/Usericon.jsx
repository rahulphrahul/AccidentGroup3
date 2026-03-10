import React from "react";
import "./Usericon.css";

const AxidSplash = () => {
  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Orbitron:wght@600;700&display=swap"
        rel="stylesheet"
      />

      <div className="phone-wrapper">
        <div className="splash-screen">
          <div className="logo-section zomato-animate">
            <div className="logo-bg">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                {/* Heart */}
                <path
                  d="M12 21s-7-4.5-9-8.5C1 8 4 5 7 6c2 1 3 3 5 4 2-1 3-3 5-4 3-1 6 2 4 6.5-2 4-9 8.5-9 8.5z"
                  stroke="white"
                  strokeWidth="1.4"
                />

                {/* Pulse */}
                <path
                  d="M3 12h4l2-3 3 6 2-4h4"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h1 className="app-name">AXID</h1>
            <p className="app-tagline">Accident Detection System</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AxidSplash;
