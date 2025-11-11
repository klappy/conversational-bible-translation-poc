import { useState, useEffect } from "react";
import "./AgentInspector.css";

function AgentInspector() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/.netlify/functions/agent-prompts");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setAgents(data.agents);
      // Auto-select first assistant
      if (data.agents.length > 0) {
        setSelectedAgent(data.agents[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch assistants:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const formatPrompt = (prompt) => {
    if (!prompt) return <div className="prompt-line">No prompt available</div>;

    const lines = prompt.split("\n");
    const elements = [];
    let lineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const key = `line-${lineIndex++}`;

      // Section headers (em-dash headers)
      if (line.trim().startsWith("—") && line.trim().length > 1) {
        elements.push(
          <div key={key} className="prompt-section-header">
            {highlightSearchInText(line)}
          </div>
        );
        continue;
      }

      // Critical sections
      if (line.includes("🚨")) {
        elements.push(
          <div key={key} className="prompt-critical">
            {highlightSearchInText(line)}
          </div>
        );
        continue;
      }

      // Warnings/Important notes
      if (line.includes("⚠️")) {
        elements.push(
          <div key={key} className="prompt-warning">
            {highlightSearchInText(line)}
          </div>
        );
        continue;
      }

      // Success/Check markers
      if (line.includes("✅")) {
        elements.push(
          <div key={key} className="prompt-success">
            {highlightSearchInText(line)}
          </div>
        );
        continue;
      }

      // Error/Forbidden markers
      if (line.includes("❌") || line.includes("⛔")) {
        elements.push(
          <div key={key} className="prompt-error">
            {highlightSearchInText(line)}
          </div>
        );
        continue;
      }

      // Bullet points
      if (line.trim().startsWith("•")) {
        elements.push(
          <div key={key} className="prompt-bullet">
            {highlightSearchInText(line)}
          </div>
        );
        continue;
      }

      // Code blocks (triple backticks)
      if (line.trim().startsWith("```")) {
        elements.push(
          <div key={key} className="prompt-code-fence">
            {highlightSearchInText(line)}
          </div>
        );
        continue;
      }

      // JSON-like structures
      if (line.trim().startsWith("{") || line.trim().startsWith("}")) {
        elements.push(
          <div key={key} className="prompt-json">
            {highlightSearchInText(line)}
          </div>
        );
        continue;
      }

      // Example blocks
      if (line.includes("Example:") || line.includes("EXAMPLE")) {
        elements.push(
          <div key={key} className="prompt-example">
            {highlightSearchInText(line)}
          </div>
        );
        continue;
      }

      // Regular lines
      if (line.trim() === "") {
        elements.push(<div key={key} className="prompt-blank-line">&nbsp;</div>);
      } else {
        elements.push(
          <div key={key} className="prompt-line">
            {highlightSearchInText(line)}
          </div>
        );
      }
    }

    return <div className="prompt-formatted">{elements}</div>;
  };

  const highlightSearchInText = (text) => {
    if (!searchTerm || searchTerm.trim() === "") {
      return text;
    }

    const parts = text.split(new RegExp(`(${escapeRegExp(searchTerm)})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i}>{part}</mark>
      ) : (
        part
      )
    );
  };

  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const getMatchCount = () => {
    if (!selectedAgent || !searchTerm) return 0;
    const regex = new RegExp(escapeRegExp(searchTerm), "gi");
    const matches = selectedAgent.systemPrompt.match(regex);
    return matches ? matches.length : 0;
  };

  if (loading) {
    return (
      <div className="agent-inspector loading">
        <div className="loading-spinner">Loading assistant data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agent-inspector error">
        <div className="error-message">
          <h2>Failed to Load Assistants</h2>
          <p>{error}</p>
          <button onClick={fetchAgents}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-inspector">
      <div className="inspector-header">
        <div className="header-top">
          <h1>🔍 Assistant Prompt Inspector</h1>
          <button
            className="back-button"
            onClick={() => window.dispatchEvent(new CustomEvent('toggleInspector'))}
          >
            ← Back to Translation
          </button>
        </div>
        <p className="subtitle">
          Behind the curtain of Conversational Bible Translation
        </p>

        <div className="inspector-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search in prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <span className="search-matches">
                {getMatchCount()} {getMatchCount() === 1 ? "match" : "matches"}
              </span>
            )}
          </div>
          <button onClick={() => setShowStats(!showStats)} className="stats-toggle">
            {showStats ? "📊 Hide Stats" : "📊 Show Stats"}
          </button>
        </div>
      </div>

      <div className="inspector-layout">
        <div className="agent-list">
          <h2>Assistants ({agents.length})</h2>
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={`agent-card ${selectedAgent?.id === agent.id ? "selected" : ""} ${!agent.active ? "inactive" : ""}`}
              onClick={() => setSelectedAgent(agent)}
            >
              <span className="agent-icon" style={{ color: agent.color }}>
                {agent.icon}
              </span>
              <div className="agent-info">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-role">{agent.role}</div>
                {showStats && (
                  <div className="agent-stats">
                    {agent.promptStats.lines} lines • {agent.promptStats.sections}{" "}
                    sections
                    {agent.promptStats.criticalSections > 0 &&
                      ` • ${agent.promptStats.criticalSections} critical`}
                  </div>
                )}
              </div>
              <div className={`agent-status ${agent.active ? "active" : "inactive"}`}>
                {agent.active ? "✓" : "✗"}
              </div>
            </div>
          ))}
        </div>

        <div className="prompt-viewer">
          {selectedAgent ? (
            <>
              <div className="viewer-header">
                <h2>
                  <span style={{ color: selectedAgent.color }}>
                    {selectedAgent.icon}
                  </span>{" "}
                  {selectedAgent.name}
                </h2>
                <div className="agent-metadata">
                  <span className="metadata-item">
                    Model: {selectedAgent.model}
                  </span>
                  <span className="metadata-item">
                    Status: {selectedAgent.active ? "Active" : "Inactive"}
                  </span>
                  <span className="metadata-item">
                    Prompt: {selectedAgent.promptStats.length.toLocaleString()}{" "}
                    chars
                  </span>
                  <span className="metadata-item">
                    Lines: {selectedAgent.promptStats.lines}
                  </span>
                  {selectedAgent.promptStats.criticalSections > 0 && (
                    <span className="metadata-item critical">
                      🚨 {selectedAgent.promptStats.criticalSections} critical
                      sections
                    </span>
                  )}
                </div>
              </div>

              <div className="prompt-content">{formatPrompt(selectedAgent.systemPrompt)}</div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select an assistant to view its system prompt</p>
              <p className="hint">
                Each assistant has specialized instructions that guide its behavior in the
                translation workflow.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentInspector;

