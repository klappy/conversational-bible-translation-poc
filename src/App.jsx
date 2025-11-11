import { useState, useEffect } from "react";
import ChatInterfaceMultiAgent from "./components/ChatInterfaceMultiAgent";
import ScriptureCanvas from "./components/ScriptureCanvas";
import MobileSwipeView from "./components/MobileSwipeView";
import AgentInspector from "./components/AgentInspector";
import WorkshopSplashModal from "./components/WorkshopSplashModal";
import { TranslationProvider } from "./contexts/TranslationContext";
import "./App.css";

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showSplashModal, setShowSplashModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Listen for inspector toggle event from AgentStatus button
    const handleToggleInspector = () => {
      setShowInspector((prev) => !prev);
    };

    window.addEventListener("toggleInspector", handleToggleInspector);
    return () => window.removeEventListener("toggleInspector", handleToggleInspector);
  }, []);

  useEffect(() => {
    // Check if user has seen the workshop splash modal
    const hasSeenSplash = localStorage.getItem("hasSeenWorkshopSplash");
    if (!hasSeenSplash) {
      // Delay showing the modal slightly so the app loads first
      const timer = setTimeout(() => {
        setShowSplashModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // If inspector is active, show it instead of normal app
  if (showInspector) {
    return <AgentInspector />;
  }

  return (
    <TranslationProvider>
      <div className='app'>
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
      <WorkshopSplashModal
        isOpen={showSplashModal}
        onClose={() => setShowSplashModal(false)}
      />
    </TranslationProvider>
  );
}

export default App;
