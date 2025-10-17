import { createContext, useContext, useState, useCallback } from "react";

const TranslationContext = createContext();

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
};

const WORKFLOW_PHASES = {
  PLANNING: "planning",
  UNDERSTANDING: "understanding",
  DRAFTING: "drafting",
  CHECKING: "checking",
  SHARING: "sharing",
  PUBLISHING: "publishing",
};

export const TranslationProvider = ({ children }) => {
  // Project state
  const [project, setProject] = useState({
    styleGuide: {
      languagePair: "English → English",
      readingLevel: "Grade 1",
      tone: "Narrator, engaging tone",
      philosophy: "Meaning-based",
    },
    glossary: {
      terms: {},
    },
    scriptureCanvas: {
      verses: {},
    },
    feedback: {
      comments: [],
    },
  });

  // Workflow state
  const [workflow, setWorkflow] = useState({
    currentPhase: WORKFLOW_PHASES.PLANNING,
    currentVerse: "Ruth 1:1",
    currentPhrase: 0,
    verseProgress: {},
    phrasesCompleted: {}, // Track completed phrases with user's articulation
    totalPhrases: 0,
  });

  // Chat history - starts empty, will be populated after loading server state
  const [messages, setMessages] = useState([]);

  // Update style guide
  const updateStyleGuide = useCallback((updates) => {
    setProject((prev) => ({
      ...prev,
      styleGuide: { ...prev.styleGuide, ...updates },
    }));
  }, []);

  // Add term to glossary
  const addGlossaryTerm = useCallback((term, definition, notes = "") => {
    setProject((prev) => ({
      ...prev,
      glossary: {
        ...prev.glossary,
        terms: {
          ...prev.glossary.terms,
          [term]: { definition, notes, userProvided: true },
        },
      },
    }));
  }, []);

  // Update verse in scripture canvas
  const updateVerse = useCallback((verseRef, content, type = "draft") => {
    setProject((prev) => ({
      ...prev,
      scriptureCanvas: {
        ...prev.scriptureCanvas,
        verses: {
          ...prev.scriptureCanvas.verses,
          [verseRef]: {
            ...prev.scriptureCanvas.verses[verseRef],
            [type]: content,
            lastModified: new Date(),
          },
        },
      },
    }));
  }, []);

  // Add feedback
  const addFeedback = useCallback((verseRef, comment, reviewer = "Community") => {
    setProject((prev) => ({
      ...prev,
      feedback: {
        ...prev.feedback,
        comments: [
          ...prev.feedback.comments,
          {
            id: Date.now(),
            verseRef,
            comment,
            reviewer,
            timestamp: new Date(),
            resolved: false,
          },
        ],
      },
    }));
  }, []);

  // Progress workflow
  const progressWorkflow = useCallback((phase, verse = null, phrase = null) => {
    setWorkflow((prev) => ({
      ...prev,
      currentPhase: phase,
      ...(verse && { currentVerse: verse }),
      ...(phrase !== null && { currentPhrase: phrase }),
    }));
  }, []);

  // Track phrase completion during Understanding phase
  const completePhraseUnderstanding = useCallback((phraseIndex, userArticulation) => {
    setWorkflow((prev) => {
      const key = `${prev.currentVerse}-${phraseIndex}`;
      return {
        ...prev,
        phrasesCompleted: {
          ...prev.phrasesCompleted,
          [key]: {
            articulation: userArticulation,
            timestamp: new Date(),
          },
        },
      };
    });
  }, []);

  // Move to next phrase
  const nextPhrase = useCallback(() => {
    setWorkflow((prev) => ({
      ...prev,
      currentPhrase: Math.min(prev.currentPhrase + 1, prev.totalPhrases - 1),
    }));
  }, []);

  // Set current phrase directly
  const setCurrentPhrase = useCallback((phraseIndex) => {
    setWorkflow((prev) => ({
      ...prev,
      currentPhrase: phraseIndex,
    }));
  }, []);

  // Mark pericope as read
  const markPericopeRead = useCallback(() => {
    setWorkflow((prev) => ({
      ...prev,
      pericopeRead: true,
    }));
  }, []);

  // Check if all phrases are complete for current verse
  const isVerseUnderstandingComplete = useCallback(() => {
    const completedCount = Object.keys(workflow.phrasesCompleted).filter((key) =>
      key.startsWith(workflow.currentVerse)
    ).length;
    return completedCount === workflow.totalPhrases && workflow.totalPhrases > 0;
  }, [workflow]);

  // Add message to chat
  const addMessage = useCallback((message) => {
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        id: Date.now(),
        timestamp: new Date(),
      },
    ]);
  }, []);
  
  // Generate initial message based on server state
  const generateInitialMessage = useCallback((serverState) => {
    const styleGuide = serverState?.styleGuide || project.styleGuide;
    const readingLevel = styleGuide.readingLevel || "Grade 1";
    const languagePair = styleGuide.languagePair || "English → English";
    const tone = styleGuide.tone || "Narrator, engaging tone";
    const philosophy = styleGuide.philosophy || "Meaning-based";
    
    return {
      id: 1,
      role: "assistant",
      agent: { 
        id: 'primary', 
        icon: '📖', 
        color: '#3B82F6',
        name: 'Translation Assistant'
      },
      content: `Welcome! Let's translate Ruth together. What languages are we working with?`,
      timestamp: new Date(),
    };
  }, [project.styleGuide]);

  // Update local state from server state
  const updateFromServerState = useCallback((serverState) => {
    if (!serverState) return;
    
    // Update project state
    if (serverState.styleGuide) {
      setProject(prev => ({
        ...prev,
        styleGuide: { ...prev.styleGuide, ...serverState.styleGuide }
      }));
    }
    
    if (serverState.glossary) {
      setProject(prev => ({
        ...prev,
        glossary: serverState.glossary
      }));
    }
    
    if (serverState.scriptureCanvas) {
      setProject(prev => ({
        ...prev,
        scriptureCanvas: serverState.scriptureCanvas
      }));
    }
    
    if (serverState.feedback) {
      setProject(prev => ({
        ...prev,
        feedback: serverState.feedback
      }));
    }
    
    // Update workflow state
    if (serverState.workflow) {
      setWorkflow(prev => ({
        ...prev,
        ...serverState.workflow
      }));
    }
  }, []);

  const value = {
    project,
    workflow,
    messages,
    updateStyleGuide,
    addGlossaryTerm,
    updateVerse,
    addFeedback,
    progressWorkflow,
    completePhraseUnderstanding,
    nextPhrase,
    setCurrentPhrase,
    markPericopeRead,
    isVerseUnderstandingComplete,
    addMessage,
    setMessages,
    generateInitialMessage,
    updateFromServerState,
    WORKFLOW_PHASES,
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};
