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

  const renderStyleGuide = () => {
    // Define the display order and labels for fields
    const fieldConfig = {
      userName: { label: "Your Name", defaultValue: "Not set" },
      conversationLanguage: { label: "Conversation Language", defaultValue: "English" },
      sourceLanguage: { label: "Source Language", defaultValue: "English" },
      targetLanguage: { label: "Target Language", defaultValue: "English" },
      targetCommunity: { label: "Target Community", defaultValue: "Not set" },
      readingLevel: { label: "Reading Level", defaultValue: "Not set" },
      tone: { label: "Tone", defaultValue: "Not set" },
      philosophy: { label: "Translation Philosophy", defaultValue: "Not set" },
      approach: { label: "Translation Approach", defaultValue: "Not set" },
    };

    // Filter out fields that are null, undefined, or match default values
    const fieldsToDisplay = Object.keys(fieldConfig).filter((key) => {
      const value = project.styleGuide[key];
      // Show field if it has a non-default value
      return value !== null && value !== undefined && value !== "";
    });

    // If no fields have values, show the most important ones with defaults
    const displayFields = fieldsToDisplay.length > 0 
      ? fieldsToDisplay 
      : ['conversationLanguage', 'sourceLanguage', 'targetLanguage', 'readingLevel', 'tone', 'philosophy'];

    return (
      <div className='canvas-section'>
        <h3>Translation Settings</h3>
        <div className='style-guide-content'>
          {displayFields.map((key) => {
            const config = fieldConfig[key];
            if (!config) return null; // Skip unknown fields
            
            const value = project.styleGuide[key];
            const displayValue = value || config.defaultValue;
            
            return (
              <div key={key} className='guide-item'>
                <label>{config.label}</label>
                <div className='value'>{displayValue}</div>
              </div>
            );
          })}
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
  };

  const renderGlossary = () => {
    const keyTerms = project.glossary?.keyTerms || {};
    const userPhrases = project.glossary?.userPhrases || {};
    const hasContent = Object.keys(keyTerms).length > 0 || Object.keys(userPhrases).length > 0;

    return (
      <div className='canvas-section'>
        <h3>Glossary</h3>
        <div className='glossary-content'>
          {!hasContent ? (
            <p className='empty-state'>Terms and phrases will appear as you discuss the passage</p>
          ) : (
            <>
              {/* User Phrases - What you said about each phrase */}
              {Object.keys(userPhrases).length > 0 && (
                <div className='glossary-section'>
                  <h4>Your Phrase Translations</h4>
                  <div className='terms-list'>
                    {Object.entries(userPhrases).map(([phrase, translation]) => {
                      // Handle both old format (phrase_1) and new format (actual phrase text)
                      const displayPhrase = phrase.startsWith('phrase_') 
                        ? `Phrase ${phrase.split('_')[1]}` 
                        : phrase;
                      
                      return (
                        <div key={phrase} className='term-item phrase-item'>
                          <div className='term-header'>
                            <strong className='original-phrase'>{displayPhrase}</strong>
                          </div>
                          <p className='definition user-translation'>→ {translation}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Key Terms - Biblical terms */}
              {Object.keys(keyTerms).length > 0 && (
                <div className='glossary-section'>
                  <h4>Key Biblical Terms</h4>
                  <div className='terms-list'>
                    {Object.entries(keyTerms).map(([term, data]) => (
                      <div key={term} className='term-item'>
                        <div className='term-header'>
                          <strong>{term}</strong>
                          {data.verse && <span className='verse-ref'>{data.verse}</span>}
                        </div>
                        <p className='definition'>{data.definition || data}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

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
