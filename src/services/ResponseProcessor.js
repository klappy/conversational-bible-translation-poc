/**
 * Process AI responses and extract actionable updates for the canvas artifacts
 */
export class ResponseProcessor {
  constructor(contextMethods) {
    this.context = contextMethods;
  }

  /**
   * Process an AI response and update the appropriate canvas artifacts
   */
  async processResponse(message, workflow) {
    const content = message.content.toLowerCase();
    const updates = [];

    // Check for pericope presentation (Ruth 1:1-5 overview)
    if (message.content.includes("Ruth 1:1-5") && 
        (content.includes("overview") ||
         content.includes("pericope") ||
         content.includes("context") ||
         content.includes("story"))) {
      updates.push({
        type: 'workflow',
        action: 'markPericopeRead',
        params: []
      });
    }

    // Check for phase transitions
    if (content.includes("let's move to understanding") || 
        content.includes("now let's understand") ||
        content.includes("understanding phase") ||
        content.includes("let's begin understanding") ||
        content.includes("now, let's look at the verse") ||
        content.includes("let's focus on verse") ||
        content.includes("let's work through verse")) {
      updates.push({
        type: 'workflow',
        action: 'progressWorkflow',
        params: ['understanding']
      });
      
      // If verse is mentioned, update the current verse and load its data
      const verseMatch = message.content.match(/(?:Ruth|ruth)\s+(\d+):(\d+)/i);
      if (verseMatch) {
        const verseRef = `Ruth ${verseMatch[1]}:${verseMatch[2]}`;
        
        // Add the original verse to scripture canvas
        const verseTextMatch = message.content.match(/(?:text|verse):\s*["']([^"']+)["']/i);
        if (verseTextMatch) {
          updates.push({
            type: 'scripture',
            action: 'updateVerse',
            params: [verseRef, verseTextMatch[1], 'original']
          });
        }
      }
      
      // Check if we're immediately going to phrase work
      const phraseMatch = message.content.match(/(?:first|starting with|let's look at).*phrase[:\s]*["']([^"']+)["']/i);
      if (phraseMatch) {
        updates.push({
          type: 'workflow',
          action: 'setCurrentPhrase',
          params: [0]  // Start with first phrase
        });
      }
    } else if (content.includes("let's start drafting") ||
               content.includes("drafting phase") ||
               content.includes("now let's create a draft")) {
      updates.push({
        type: 'workflow',
        action: 'progressWorkflow', 
        params: ['drafting']
      });
    }

    // Extract style guide updates from Planning phase
    if (workflow.currentPhase === 'planning') {
      const styleUpdates = this.extractStyleGuideUpdates(message.content);
      if (styleUpdates) {
        updates.push({
          type: 'styleGuide',
          action: 'updateStyleGuide',
          params: [styleUpdates]
        });
      }
    }

    // Extract glossary terms from Understanding phase
    if (workflow.currentPhase === 'understanding') {
      const terms = this.extractGlossaryTerms(message.content);
      terms.forEach(term => {
        updates.push({
          type: 'glossary',
          action: 'addGlossaryTerm',
          params: [term.word, term.definition, term.notes]
        });
      });

      // Check if a phrase understanding is complete
      const phraseCompletion = this.extractPhraseCompletion(message.content);
      if (phraseCompletion) {
        updates.push({
          type: 'workflow',
          action: 'completePhraseUnderstanding',
          params: [workflow.currentPhrase, phraseCompletion.articulation]
        });
      }
    }

    // Extract draft translations from Drafting phase
    if (workflow.currentPhase === 'drafting') {
      const draft = this.extractDraftTranslation(message.content);
      if (draft) {
        updates.push({
          type: 'scripture',
          action: 'updateVerse',
          params: [draft.verseRef, draft.translation, 'draft']
        });
      }
    }

    // Apply all updates
    for (const update of updates) {
      await this.applyUpdate(update);
    }

    return updates;
  }

  /**
   * Extract style guide settings from AI response
   */
  extractStyleGuideUpdates(content) {
    const updates = {};
    
    // Look for confirmed settings
    if (content.includes("settings confirmed") || 
        content.includes("i'll use") ||
        content.includes("using:")) {
      
      // Extract reading level
      const levelMatch = content.match(/grade\s+(\d+)/i);
      if (levelMatch) {
        updates.readingLevel = `Grade ${levelMatch[1]}`;
      }

      // Extract language pair
      const langMatch = content.match(/(\w+)\s*→\s*(\w+)/);
      if (langMatch) {
        updates.languagePair = `${langMatch[1]} → ${langMatch[2]}`;
      }

      // Extract philosophy
      if (content.includes("meaning-based")) {
        updates.philosophy = "Meaning-based";
      } else if (content.includes("literal")) {
        updates.philosophy = "Literal";
      }

      // Extract tone
      if (content.includes("narrator")) {
        updates.tone = "Narrator, engaging tone";
      } else if (content.includes("formal")) {
        updates.tone = "Formal";
      }
    }

    return Object.keys(updates).length > 0 ? updates : null;
  }

  /**
   * Extract glossary terms from AI response
   */
  extractGlossaryTerms(content) {
    const terms = [];
    
    // Look for term definitions
    const termPatterns = [
      /["']([^"']+)["']\s+(?:means?|refers? to|is)\s+([^.]+)/gi,
      /The\s+(?:term|word)\s+["']([^"']+)["'].+?(?:means?|is)\s+([^.]+)/gi,
    ];

    for (const pattern of termPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        terms.push({
          word: match[1],
          definition: match[2].trim(),
          notes: 'AI-extracted definition'
        });
      }
    }

    // Look for cultural context
    if (content.includes("cultural context") || 
        content.includes("historical background")) {
      const contextMatch = content.match(/(?:cultural|historical)\s+(?:context|background)[:\s]+([^.]+)/i);
      if (contextMatch) {
        terms.push({
          word: 'Cultural Note',
          definition: contextMatch[1].trim(),
          notes: 'Background information'
        });
      }
    }

    return terms;
  }

  /**
   * Extract phrase completion from Understanding phase
   */
  extractPhraseCompletion(content) {
    // Look for user articulation being acknowledged
    if (content.includes("great way to express") ||
        content.includes("i understand you'd say") ||
        content.includes("your phrasing") ||
        content.includes("you've expressed") ||
        content.includes("good") ||
        content.includes("let me note that")) {
      
      // Try to extract the articulation - look for quoted text
      const patterns = [
        /["']([^"']{10,})["']/,  // Any quoted text of reasonable length
        /you (?:said|mentioned|expressed)[:\s]+["']?([^"'\n]+)/i,
        /your (?:words|phrasing|articulation)[:\s]+["']?([^"'\n]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          return {
            articulation: match[1].trim()
          };
        }
      }
    }

    return null;
  }
  
  /**
   * Process user input during Understanding phase to capture articulations
   */
  processUserInput(message, workflow) {
    const updates = [];
    
    if (workflow.currentPhase === 'understanding' && workflow.currentPhrase !== undefined) {
      // User is providing their articulation of the current phrase
      // Store it for later use in drafting
      updates.push({
        type: 'articulation',
        action: 'completePhraseUnderstanding',
        params: [workflow.currentPhrase, message.content]
      });
    }
    
    return updates;
  }

  /**
   * Extract draft translation from Drafting phase
   */
  extractDraftTranslation(content) {
    // Look for draft presentation
    if (content.includes("here's the draft") ||
        content.includes("draft translation") ||
        content.includes("based on your input")) {
      
      // Extract verse reference
      const verseMatch = content.match(/(?:Ruth|ruth)\s+(\d+):(\d+)/i);
      if (verseMatch) {
        const verseRef = `Ruth ${verseMatch[1]}:${verseMatch[2]}`;
        
        // Extract the draft text (usually in quotes or after a colon)
        const draftMatch = content.match(/(?:draft|translation)[:\s]+["']?([^"'\n]+)/i);
        if (draftMatch) {
          return {
            verseRef,
            translation: draftMatch[1].trim()
          };
        }
      }
    }

    return null;
  }

  /**
   * Apply an update to the context
   */
  async applyUpdate(update) {
    const method = this.context[update.action];
    if (method && typeof method === 'function') {
      method(...update.params);
    }
  }
}

/**
 * Factory function to create a response processor
 */
export function createResponseProcessor(contextMethods) {
  return new ResponseProcessor(contextMethods);
}
