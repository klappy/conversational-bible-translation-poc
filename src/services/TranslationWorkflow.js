// FIA Translation Workflow State Machine
export class TranslationWorkflow {
  constructor() {
    this.phases = {
      PLANNING: "planning",
      UNDERSTANDING: "understanding",
      DRAFTING: "drafting",
      CHECKING: "checking",
      SHARING: "sharing",
      PUBLISHING: "publishing",
    };

    this.currentPhase = this.phases.PLANNING;
    this.currentVerse = "Ruth 1:1";
    this.currentPhraseIndex = 0;
    this.verseData = null;
    this.phrasesCompleted = {};
  }

  async loadVerseData(verseRef) {
    try {
      const response = await fetch("/data/ruth/bsb-ruth-1.json");
      const data = await response.json();

      // Parse verse reference (e.g., "Ruth 1:1")
      const verseNum = parseInt(verseRef.split(":")[1]);
      const verse = data.verses.find((v) => v.verse === verseNum);

      if (verse) {
        this.verseData = verse;
        this.currentVerse = verseRef;
        this.currentPhraseIndex = 0;
        return verse;
      }

      throw new Error("Verse not found");
    } catch (error) {
      console.error("Failed to load verse data:", error);
      return null;
    }
  }

  getCurrentPhrase() {
    if (!this.verseData || !this.verseData.phrases) {
      return null;
    }
    return this.verseData.phrases[this.currentPhraseIndex];
  }

  nextPhrase() {
    if (this.verseData && this.currentPhraseIndex < this.verseData.phrases.length - 1) {
      this.currentPhraseIndex++;
      return this.getCurrentPhrase();
    }
    return null;
  }

  previousPhrase() {
    if (this.currentPhraseIndex > 0) {
      this.currentPhraseIndex--;
      return this.getCurrentPhrase();
    }
    return null;
  }

  markPhraseComplete(phraseIndex, userTranslation) {
    const key = `${this.currentVerse}-${phraseIndex}`;
    this.phrasesCompleted[key] = {
      original: this.verseData.phrases[phraseIndex],
      translation: userTranslation,
      timestamp: new Date(),
    };
  }

  isVerseComplete() {
    if (!this.verseData) return false;

    for (let i = 0; i < this.verseData.phrases.length; i++) {
      const key = `${this.currentVerse}-${i}`;
      if (!this.phrasesCompleted[key]) {
        return false;
      }
    }
    return true;
  }

  canProgressPhase(fromPhase, toPhase) {
    const phaseOrder = [
      this.phases.PLANNING,
      this.phases.UNDERSTANDING,
      this.phases.DRAFTING,
      this.phases.CHECKING,
      this.phases.SHARING,
      this.phases.PUBLISHING,
    ];

    const fromIndex = phaseOrder.indexOf(fromPhase);
    const toIndex = phaseOrder.indexOf(toPhase);

    // Can only progress forward or stay in same phase
    return toIndex >= fromIndex;
  }

  transitionTo(newPhase) {
    if (this.canProgressPhase(this.currentPhase, newPhase)) {
      this.currentPhase = newPhase;
      return true;
    }
    return false;
  }

  // Generate questions for Understanding phase
  generateUnderstandingQuestions(phrase) {
    const questions = [];

    // Check for key terms that need explanation
    const keyTerms = this.extractKeyTerms(phrase);

    if (keyTerms.length > 0) {
      keyTerms.forEach((term) => {
        questions.push({
          type: "concept",
          term: term,
          question: `The term "${term}" appears in this phrase. How would your audience understand this concept? What words or expressions would they use?`,
        });
      });
    }

    // Add general comprehension question
    questions.push({
      type: "comprehension",
      question: `Looking at "${phrase}", what is the main action or idea being communicated? How would you naturally express this in your target language?`,
    });

    // Check for cultural elements
    if (this.hasCulturalElement(phrase)) {
      questions.push({
        type: "cultural",
        question: `This phrase contains cultural or historical context. How would you help your audience understand this in their context?`,
      });
    }

    return questions;
  }

  extractKeyTerms(phrase) {
    // Simple keyword extraction - in production, use NLP
    const keyTerms = [
      "judges",
      "famine",
      "Bethlehem",
      "Judah",
      "Moab",
      "LORD",
      "kindness",
      "daughters-in-law",
      "Ephrathites",
      "rest",
      "redeem",
      "loyalty",
      "blessing",
    ];

    const found = [];
    const phraseLower = phrase.toLowerCase();

    keyTerms.forEach((term) => {
      if (phraseLower.includes(term.toLowerCase())) {
        found.push(term);
      }
    });

    return found;
  }

  hasCulturalElement(phrase) {
    const culturalMarkers = [
      "judges ruled",
      "Bethlehem",
      "Judah",
      "Moab",
      "mother's house",
      "daughters-in-law",
      "Ephrathites",
    ];

    const phraseLower = phrase.toLowerCase();
    return culturalMarkers.some((marker) => phraseLower.includes(marker.toLowerCase()));
  }

  // Compile draft from user phrases
  compileDraft() {
    if (!this.isVerseComplete()) {
      return null;
    }

    const translations = [];
    for (let i = 0; i < this.verseData.phrases.length; i++) {
      const key = `${this.currentVerse}-${i}`;
      if (this.phrasesCompleted[key]) {
        translations.push(this.phrasesCompleted[key].translation);
      }
    }

    return translations.join(" ");
  }

  // Get progress statistics
  getProgress() {
    if (!this.verseData) {
      return {
        currentPhase: this.currentPhase,
        currentVerse: this.currentVerse,
        phrasesCompleted: 0,
        phrasesTotal: 0,
        percentComplete: 0,
      };
    }

    const completed = Object.keys(this.phrasesCompleted).filter((key) =>
      key.startsWith(this.currentVerse)
    ).length;

    const total = this.verseData.phrases.length;

    return {
      currentPhase: this.currentPhase,
      currentVerse: this.currentVerse,
      phrasesCompleted: completed,
      phrasesTotal: total,
      percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}

// Singleton instance
let workflowInstance = null;

export function getWorkflow() {
  if (!workflowInstance) {
    workflowInstance = new TranslationWorkflow();
  }
  return workflowInstance;
}

export function resetWorkflow() {
  workflowInstance = new TranslationWorkflow();
  return workflowInstance;
}
