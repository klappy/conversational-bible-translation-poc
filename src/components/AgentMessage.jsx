import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./AgentMessage.css";

const agentProfiles = {
  primary: {
    name: "Translation Assistant",
    icon: "📖",
    color: "#3B82F6",
    role: "Guides you through the translation process"
  },
  state: {
    name: "Canvas Scribe",
    icon: "📝", 
    color: "#10B981",
    role: "Records and organizes your work"
  },
  validator: {
    name: "Quality Checker",
    icon: "✅",
    color: "#F97316",
    role: "Ensures accuracy and consistency"
  },
  resource: {
    name: "Resource Librarian",
    icon: "📚",
    color: "#6366F1",
    role: "Provides biblical resources and context"
  },
  orchestrator: {
    name: "Team Coordinator",
    icon: "🎭",
    color: "#8B5CF6",
    role: "Manages the conversation flow"
  },
  user: {
    name: "You",
    icon: "👤",
    color: "#6B7280",
    role: "Bible translator"
  }
};

const AgentMessage = ({ message, agent, timestamp }) => {
  const profile = agent ? agentProfiles[agent.id || agent] : agentProfiles.user;
  
  // Determine if this is a user message
  const isUser = message.role === "user";
  
  // Get the actual profile based on whether it's a user or agent
  const displayProfile = isUser ? agentProfiles.user : (profile || agentProfiles.primary);
  
  return (
    <div 
      className={`agent-message ${isUser ? 'user' : 'agent'} ${agent?.id || ''}`}
      style={{ 
        borderLeftColor: displayProfile.color,
        backgroundColor: isUser ? 'transparent' : `${displayProfile.color}08`
      }}
    >
      <div className="agent-avatar" style={{ borderColor: displayProfile.color }}>
        <span className="agent-icon">{displayProfile.icon}</span>
      </div>
      
      <div className="message-content">
        <div className="agent-header">
          <span className="agent-name" style={{ color: displayProfile.color }}>
            {displayProfile.name}
          </span>
          {!isUser && (
            <span className="agent-role">{displayProfile.role}</span>
          )}
          <span className="timestamp">
            {timestamp ? new Date(timestamp).toLocaleTimeString() : ''}
          </span>
        </div>
        
        <div className="message-text">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        
        {/* Show if this is a warning or validation message */}
        {message.type === 'warning' && (
          <div className="message-warning">
            ⚠️ {message.category}: {message.content}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentMessage;
