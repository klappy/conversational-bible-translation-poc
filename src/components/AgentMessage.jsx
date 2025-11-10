import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./AgentMessage.css";

const agentProfiles = {
  primary: {
    name: "Translation Assistant",
    icon: "📖",
    color: "#3B82F6",
    role: "Guides overall flow and transitions"
  },
  settings_collector: {
    name: "Settings Guide",
    icon: "📋",
    color: "#3B82F6",
    role: "Collects translation preferences"
  },
  context_guide: {
    name: "Context Guide",
    icon: "📖",
    color: "#8B5CF6",
    role: "Provides biblical context progressively"
  },
  understanding_guide: {
    name: "Understanding Guide",
    icon: "🔍",
    color: "#10B981",
    role: "Explores phrase meanings with you"
  },
  draft_builder: {
    name: "Draft Builder",
    icon: "✏️",
    color: "#F59E0B",
    role: "Creates translation drafts from glossary"
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
  suggestions: {
    name: "Suggestion Helper",
    icon: "💡",
    color: "#F59E0B",
    role: "Generates contextual quick responses"
  },
  user: {
    name: "You",
    icon: "👤",
    color: "#6B7280",
    role: "Bible translator"
  }
};

const AgentMessage = ({ message, agent, timestamp }) => {
  // Determine if this is a user message
  const isUser = message.role === "user";
  
  // Get the profile - for assistant messages without agent, default to primary
  let profile;
  if (isUser) {
    profile = agentProfiles.user;
  } else if (agent) {
    // If agent has the visual info directly, use it
    if (agent.icon && agent.name && agent.color) {
      profile = {
        name: agent.name,
        icon: agent.icon,
        color: agent.color,
        role: agent.role || "Team member"
      };
    } else {
      // Try to look up by id for backward compatibility
      profile = agentProfiles[agent.id || agent] || agentProfiles.primary;
    }
  } else {
    // Assistant message without agent info defaults to primary
    profile = agentProfiles.primary;
  }
  
  const displayProfile = profile;
  
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
