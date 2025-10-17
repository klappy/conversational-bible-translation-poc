import React, { useState, useEffect } from "react";
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

const AgentStatus = ({ activeAgents = [], thinking = [], defaultViewMode = 'compact' }) => {
  const [viewMode, setViewMode] = useState(() => {
    // Load saved preference from localStorage
    return localStorage.getItem('agentPanelView') || defaultViewMode;
  });
  
  // Auto-expand when agents are thinking
  useEffect(() => {
    if (thinking.length > 0 && viewMode === 'collapsed') {
      setViewMode('compact');
    }
  }, [thinking, viewMode]);
  
  // Save view preference
  useEffect(() => {
    localStorage.setItem('agentPanelView', viewMode);
  }, [viewMode]);
  
  // Get all agents and mark which are active
  const allAgents = Object.keys(agentProfiles).map(id => ({
    id,
    ...agentProfiles[id],
    active: activeAgents.includes(id),
    isThinking: thinking.includes(id)
  }));
  
  const handleViewToggle = () => {
    const modes = ['collapsed', 'compact', 'expanded'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewMode(modes[nextIndex]);
  };

  // Collapsed view - just a thin bar
  if (viewMode === 'collapsed') {
    return (
      <div className="agent-status-panel collapsed">
        <div className="agent-status-collapsed-bar" onClick={handleViewToggle}>
          <div className="collapsed-content">
            <span className="collapsed-icon">👥</span>
            <span className="collapsed-text">
              {activeAgents.length} agent{activeAgents.length !== 1 ? 's' : ''} active
            </span>
            {thinking.length > 0 && (
              <span className="thinking-indicator-dot" />
            )}
          </div>
          <button className="expand-button" aria-label="Expand agent panel">
            ▼
          </button>
        </div>
      </div>
    );
  }
  
  // Compact view - horizontal layout
  if (viewMode === 'compact') {
    return (
      <div className="agent-status-panel compact">
        <div className="agent-status-header compact-header">
          <div className="compact-agents">
            {allAgents.map(agent => (
              <div
                key={agent.id}
                className={`agent-compact-item ${agent.active ? 'active' : 'inactive'} ${agent.isThinking ? 'thinking' : ''}`}
                title={`${agent.name}: ${agent.isThinking ? 'Thinking...' : agent.active ? 'Ready' : 'Inactive'}`}
              >
                <span className="agent-icon">{agent.icon}</span>
                <span
                  className="compact-status-dot"
                  style={{
                    backgroundColor: agent.active ? agent.color : '#CBD5E1'
                  }}
                >
                  {agent.isThinking && <span className="thinking-pulse" />}
                </span>
              </div>
            ))}
          </div>
          <button
            className="view-toggle-button"
            onClick={handleViewToggle}
            title="Toggle view mode"
          >
            {viewMode === 'compact' ? '⊞' : '⊟'}
          </button>
        </div>
      </div>
    );
  }
  
  // Expanded view - original vertical layout
  return (
    <div className="agent-status-panel expanded">
      <div className="agent-status-header">
        <h3>Translation Team</h3>
        <div className="header-controls">
          <span className="agent-count">
            {activeAgents.length} active
          </span>
          <button
            className="view-toggle-button"
            onClick={handleViewToggle}
            title="Collapse panel"
          >
            ⊟
          </button>
        </div>
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
