import { useState, useEffect } from "react";
import { getSessionInfo, clearSession, getShareableUrl } from "../utils/sessionManager";
import "./SessionInfo.css";

const SessionInfo = ({ showDebug = false }) => {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSessionInfo(getSessionInfo());
  }, []);

  const handleCopyUrl = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewSession = () => {
    if (confirm("Start a new session? This will clear your current translation progress.")) {
      clearSession();
    }
  };

  if (!sessionInfo) return null;

  // Only show in debug mode or for workshop sessions
  if (!showDebug && !sessionInfo.isWorkshop) return null;

  return (
    <div className='session-info'>
      {sessionInfo.isWorkshop && <div className='workshop-badge'>🎓 Workshop Session</div>}

      {showDebug && (
        <div className='session-details'>
          <div className='session-id'>Session: {sessionInfo.sessionId.substring(0, 20)}...</div>
          <div className='session-actions'>
            <button onClick={handleCopyUrl} className='copy-btn'>
              {copied ? "✓ Copied!" : "📋 Copy URL"}
            </button>
            <button onClick={handleNewSession} className='new-session-btn'>
              🔄 New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionInfo;
