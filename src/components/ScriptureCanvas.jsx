import { useState, useEffect } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import "./ScriptureCanvas.css";

const ScriptureCanvas = () => {
  const [activeTab, setActiveTab] = useState("styleGuide");
  const { project, workflow, updateStyleGuide, addGlossaryTerm } = useTranslation();

  // Map workflow phases to appropriate tabs
  const phaseToTab = {
    planning: "styleGuide",
    understanding: "glossary", // Collect terms during understanding!
    drafting: "scripture",
    checking: "scripture",
    sharing: "feedback",
    publishing: "scripture",
  };

  // Update active tab when workflow phase changes
  useEffect(() => {
    const currentPhase = workflow?.currentPhase || "planning";
    const targetTab = phaseToTab[currentPhase] || "styleGuide";
    console.log(
      "📚 ScriptureCanvas: Phase changed to",
      currentPhase,
      "-> switching to tab",
      targetTab
    );
    setActiveTab(targetTab);
  }, [workflow?.currentPhase]);

  const tabs = [
    { id: "styleGuide", label: "Style Guide", icon: "📝" },
    { id: "glossary", label: "Glossary", icon: "📚" },
    { id: "scripture", label: "Scripture", icon: "📖" },
    { id: "feedback", label: "Feedback", icon: "💬" },
  ];

  const renderStyleGuide = () => (
    <div className='canvas-section'>
      <h3>Translation Settings</h3>
      <div className='style-guide-content'>
        <div className='guide-item'>
          <label>Conversation Language</label>
          <div className='value'>{project.styleGuide.conversationLanguage || "English"}</div>
        </div>
        <div className='guide-item'>
          <label>Source Language</label>
          <div className='value'>{project.styleGuide.sourceLanguage || "English"}</div>
        </div>
        <div className='guide-item'>
          <label>Target Language</label>
          <div className='value'>{project.styleGuide.targetLanguage || "English"}</div>
        </div>
        <div className='guide-item'>
          <label>Reading Level</label>
          <div className='value'>{project.styleGuide.readingLevel}</div>
        </div>
        <div className='guide-item'>
          <label>Tone</label>
          <div className='value'>{project.styleGuide.tone}</div>
        </div>
        <div className='guide-item'>
          <label>Philosophy</label>
          <div className='value'>{project.styleGuide.philosophy}</div>
        </div>
      </div>
      <button
        className='edit-button'
        onClick={() => {
          const newLevel = prompt(
            "Enter reading level (e.g., Grade 1-8):",
            project.styleGuide.readingLevel
          );
          if (newLevel) updateStyleGuide({ readingLevel: newLevel });
        }}
      >
        Edit Settings
      </button>
    </div>
  );

  const renderGlossary = () => (
    <div className='canvas-section'>
      <h3>Key Terms</h3>
      <div className='glossary-content'>
        {Object.keys(project.glossary.terms).length === 0 ? (
          <p className='empty-state'>Terms will appear here as you progress through translation</p>
        ) : (
          <div className='terms-list'>
            {Object.entries(project.glossary.terms).map(([term, data]) => (
              <div key={term} className='term-item'>
                <div className='term-header'>
                  <strong>{term}</strong>
                  {data.userProvided && <span className='badge'>User</span>}
                </div>
                <p className='definition'>{data.definition}</p>
                {data.notes && <p className='notes'>{data.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        className='add-button'
        onClick={() => {
          const term = prompt("Enter term:");
          if (term) {
            const definition = prompt("Enter definition:");
            if (definition) {
              addGlossaryTerm(term, definition);
            }
          }
        }}
      >
        + Add Term
      </button>
    </div>
  );

  const renderScripture = () => (
    <div className='canvas-section'>
      <h3>Scripture Draft</h3>
      <div className='scripture-content'>
        {Object.keys(project.scriptureCanvas.verses).length === 0 ? (
          <p className='empty-state'>Your translation will appear here</p>
        ) : (
          <div className='verses-container'>
            {Object.entries(project.scriptureCanvas.verses).map(([ref, data]) => (
              <div key={ref} className='verse-item'>
                <div className='verse-ref'>{ref}</div>
                {data.draft && (
                  <div className='verse-text draft'>
                    <label>Draft:</label>
                    <p>{data.draft}</p>
                  </div>
                )}
                {data.original && (
                  <div className='verse-text original'>
                    <label>Original:</label>
                    <p>{data.original}</p>
                  </div>
                )}
                {data.alternates && (
                  <div className='verse-alternates'>
                    <label>Alternates:</label>
                    {data.alternates.map((alt, i) => (
                      <p key={i} className='alternate'>
                        {alt}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFeedback = () => (
    <div className='canvas-section'>
      <h3>Community Feedback</h3>
      <div className='feedback-content'>
        {project.feedback.comments.length === 0 ? (
          <p className='empty-state'>No feedback yet</p>
        ) : (
          <div className='feedback-list'>
            {project.feedback.comments.map((comment) => (
              <div
                key={comment.id}
                className={`feedback-item ${comment.resolved ? "resolved" : ""}`}
              >
                <div className='feedback-header'>
                  <strong>{comment.reviewer}</strong>
                  <span className='timestamp'>
                    {new Date(comment.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className='feedback-verse'>On {comment.verseRef}:</p>
                <p className='feedback-text'>{comment.comment}</p>
                {comment.resolved && <span className='resolved-badge'>Resolved</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "styleGuide":
        return renderStyleGuide();
      case "glossary":
        return renderGlossary();
      case "scripture":
        return renderScripture();
      case "feedback":
        return renderFeedback();
      default:
        return null;
    }
  };

  return (
    <div className='scripture-canvas'>
      <div className='canvas-tabs'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className='tab-icon'>{tab.icon}</span>
            <span className='tab-label'>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className='canvas-content'>{renderContent()}</div>
    </div>
  );
};

export default ScriptureCanvas;
