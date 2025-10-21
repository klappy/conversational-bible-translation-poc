import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getSessionId, getShareableUrl } from "../utils/sessionManager";
import "./ShareSession.css";

const ShareSession = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [sessionUrl, setSessionUrl] = useState("");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    if (isOpen) {
      const url = getShareableUrl();
      setSessionUrl(url);
      setSessionId(getSessionId());
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sessionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2>📤 Share Your Translation Session</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="share-modal-content">
          <div className="share-section">
            <h3>📱 Scan to Continue on Mobile</h3>
            <div className="qr-code-container">
              <QRCodeSVG
                value={sessionUrl}
                size={200}
                level="M"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <p className="help-text">Scan this QR code with your phone to continue translating there</p>
          </div>

          <div className="share-divider">
            <span>OR</span>
          </div>

          <div className="share-section">
            <h3>🔗 Share Link</h3>
            <div className="url-container">
              <input type="text" value={sessionUrl} readOnly className="url-input" />
              <button onClick={handleCopyUrl} className="copy-button">
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>
            <p className="help-text">
              Share this link to collaborate or continue on another device
            </p>
          </div>

          <div className="share-section">
            <h3>🔑 Session Code</h3>
            <div className="session-code-container">
              <code className="session-code">{sessionId}</code>
              <button onClick={handleCopyCode} className="copy-code-button">
                📋
              </button>
            </div>
            <p className="help-text">
              Your unique session identifier (for reference)
            </p>
          </div>

          <div className="share-info">
            <h4>ℹ️ How It Works</h4>
            <ul>
              <li>Your translation progress is automatically saved</li>
              <li>Open the link on any device to continue where you left off</li>
              <li>Share with team members to collaborate</li>
              <li>Each session is independent and private</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareSession;
