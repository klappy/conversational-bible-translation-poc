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
  });

  // Chat history
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Welcome! Let's start your Bible translation project. I'll guide you through each step.\n\nFirst, let me ask you a few questions to set up your translation:\n\n1. What language pair are you working with?\n2. What reading level are you targeting?\n3. Would you prefer a more literal or meaning-based approach?",
      timestamp: new Date(),
    },
  ]);

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

  const value = {
    project,
    workflow,
    messages,
    updateStyleGuide,
    addGlossaryTerm,
    updateVerse,
    addFeedback,
    progressWorkflow,
    addMessage,
    setMessages,
    WORKFLOW_PHASES,
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};
