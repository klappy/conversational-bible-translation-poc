import React from "react";
import "./AgentStatus.css";

const agentProfiles = {
  primary: {
    name: "Translation Assistant",
    icon: "📖",
    color: "#3B82F6"
  },
  state: {
    name: "Canvas Scribe",
    icon: "📝",
    color: "#10B981"
  },
  validator: {
    name: "Quality Checker",
    icon: "✅",
    color: "#F97316"
  },
  resource: {
    name: "Resource Librarian",
    icon: "📚",
    color: "#6366F1"
  },
  orchestrator: {
    name: "Team Coordinator",
    icon: "🎭",
    color: "#8B5CF6"
  }
};

const AgentStatus = ({ activeAgents = [], thinking = [] }) => {
  // Get all agents and mark which are active
  const allAgents = Object.keys(agentProfiles).map(id => ({
    id,
    ...agentProfiles[id],
    active: activeAgents.includes(id),
    isThinking: thinking.includes(id)
  }));

  return (
    <div className="agent-status-panel">
      <div className="agent-status-header">
        <h3>Translation Team</h3>
        <span className="agent-count">
          {activeAgents.length} active
        </span>
      </div>
      
      <div className="agent-status-list">
        {allAgents.map(agent => (
          <div 
            key={agent.id}
            className={`agent-status-item ${agent.active ? 'active' : 'inactive'} ${agent.isThinking ? 'thinking' : ''}`}
          >
            <span 
              className="status-indicator"
              style={{ 
                backgroundColor: agent.active ? agent.color : '#CBD5E1'
              }}
            >
              {agent.isThinking && (
                <span className="thinking-pulse" />
              )}
            </span>
            
            <span className="agent-icon">{agent.icon}</span>
            
            <div className="agent-info">
              <span className="agent-name">{agent.name}</span>
              {agent.isThinking && (
                <span className="agent-task">Thinking...</span>
              )}
              {agent.active && !agent.isThinking && (
                <span className="agent-task">Ready</span>
              )}
              {!agent.active && (
                <span className="agent-task">Inactive</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="agent-status-footer">
        <p className="agent-description">
          AI agents work together to help you translate accurately
        </p>
      </div>
    </div>
  );
};

export default AgentStatus;
