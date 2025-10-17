import { useState, useEffect } from "react";
import ChatInterfaceMultiAgent from "./components/ChatInterfaceMultiAgent";
import ScriptureCanvas from "./components/ScriptureCanvas";
import MobileSwipeView from "./components/MobileSwipeView";
import { TranslationProvider } from "./contexts/TranslationContext";
import "./App.css";

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    </TranslationProvider>
  );
}

export default App;
