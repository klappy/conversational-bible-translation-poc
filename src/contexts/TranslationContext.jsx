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

  // Chat history
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Welcome! I'll guide you through translating Ruth chapter 1 using the FIA methodology.\n\nLet's start by setting up your translation preferences. I'll use these defaults unless you'd like to change them:\n\n• **Language**: English → English\n• **Reading Level**: Grade 1\n• **Style**: Narrator, engaging tone\n• **Approach**: Meaning-based\n\nWould you like to:\n1. Use these settings and begin\n2. Adjust any of these settings first\n\nJust type 1 or 2, or tell me what you'd like to change!",
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
    isVerseUnderstandingComplete,
    addMessage,
    setMessages,
    WORKFLOW_PHASES,
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};
