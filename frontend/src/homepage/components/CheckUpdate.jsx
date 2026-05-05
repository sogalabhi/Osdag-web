import React, { useState, useEffect } from "react";
import fullosdagLogo from "../../assets/homepage/Logo_osdag.svg";
import osdagLogo from "../../assets/homepage/osdag_logo.png";
import "./aboutOsdag.css";

export default function CheckUpdate({ onClose }) {

  const [checking, setChecking] = useState(true);
  const latestVersion = "2026.02.0.0";

  useEffect(() => {
    const timer = setTimeout(() => {
      setChecking(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">

      <div className="bg-white border-2 border-osdag-green w-[520px] shadow-lg">

        {/* Header */}
        <div className="flex justify-between items-center px-3 border-b border-osdag-green">
          <h2 className="text-black">
          <span style={{display: "flex", alignItems: "center", gap: "8px"}}>
            <img src={osdagLogo} alt="Osdag Logo" style={{width: "20px", height: "20px"}} />Check for Updates
          </span>
          </h2>
          <button
            className="close-btn"
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#e74c3c";
              e.target.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "black";
            }}
            style={{
              backgroundColor: "transparent",
              border: "none",
              padding: "8px 14px",
              cursor: "pointer"
            }}
          >
             ✕
          </button>
        </div>

        {/* Logo Section */}
        <div className="flex items-center gap-4 px-4 pt-4">

          <img
            src={fullosdagLogo}
            alt="Osdag Logo"
            className="about-logo"
          />

        </div>

        {/* Message Box */}
        <div className="p-4">

          <div className="border rounded p-4 h-[120px] flex items-start">

            {checking ? (
              <p className="text-green-600">Checking for updates...</p>
            ) : (
              <p className="text-green-600">
                You are using the latest version of Osdag ({latestVersion}).
              </p>
            )}

          </div>

          {/* Progress bar */}
          {checking && (
            <div className="mt-4 h-4 bg-gray-200 rounded overflow-hidden relative">
              <div className="absolute h-full w-1/3 bg-osdag-green animate-progress"></div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 pb-4">

          <button
            onClick={onClose}
            className="bg-osdag-green text-white px-5 py-1 rounded"
          >
            OK
          </button>

        </div>

      </div>
    </div>
  );
}
