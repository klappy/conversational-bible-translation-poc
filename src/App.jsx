import { useState, useEffect } from "react";
import ChatInterfaceMultiAgent from "./components/ChatInterfaceMultiAgent";
import ScriptureCanvas from "./components/ScriptureCanvas";
import MobileSwipeView from "./components/MobileSwipeView";
import AgentInspector from "./components/AgentInspector";
import { TranslationProvider } from "./contexts/TranslationContext";
import "./App.css";

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorEnabled, setInspectorEnabled] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Check URL parameter for inspector mode
    const urlParams = new URLSearchParams(window.location.search);
    const inspectorParam = urlParams.get("inspector");
    
    if (inspectorParam === "true") {
      setInspectorEnabled(true);
      // Check localStorage for persisted preference
      const savedPref = localStorage.getItem("showInspector");
      if (savedPref === "true") {
        setShowInspector(true);
      }
    }
  }, []);

  const toggleInspector = () => {
    const newValue = !showInspector;
    setShowInspector(newValue);
    localStorage.setItem("showInspector", String(newValue));
  };

  // If inspector is active, show it instead of normal app
  if (showInspector) {
    return (
      <>
        {inspectorEnabled && (
          <button
            onClick={toggleInspector}
            style={{
              position: "fixed",
              top: "10px",
              right: "10px",
              zIndex: 10000,
              padding: "10px 16px",
              background: "#2196f3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            ← Back to Translation
          </button>
        )}
        <AgentInspector />
      </>
    );
  }

  return (
    <TranslationProvider>
      <div className='app'>
        {inspectorEnabled && (
          <button
            onClick={toggleInspector}
            style={{
              position: "fixed",
              top: "10px",
              right: "10px",
              zIndex: 1000,
              padding: "10px 16px",
              background: "#f0f0f0",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            title="View agent prompts and system configuration"
          >
            🔍 Agent Inspector
          </button>
        )}
        {isMobile ? (
          <MobileSwipeView />
        ) : (
          <div className='desktop-layout'>
            <div className='chat-container'>
              <ChatInterfaceMultiAgent />
            </div>
            <div className={`sidebar-container ${sidebarCollapsed ? "collapsed" : ""}`}>
              <button
                className='sidebar-toggle'
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? "◀" : "▶"}
              </button>
              {!sidebarCollapsed && <ScriptureCanvas />}
            </div>
          </div>
        )}
      </div>
    </TranslationProvider>
  );
}

export default App;
