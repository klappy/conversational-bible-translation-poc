import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the Bible translation assistant
// Helper function to extract structured updates from AI response
function extractStructuredUpdates(response, workflow) {
  const updates = [];
  const content = response.toLowerCase();

  // Detect phase transitions
  if (workflow.currentPhase === 'planning' && 
      (content.includes('understanding') || content.includes('let\'s look at the verse'))) {
    updates.push({ type: 'phase', value: 'understanding' });
  }

  // Extract settings confirmations
  if (content.includes('settings confirmed') || content.includes('using these settings')) {
    updates.push({ type: 'settings_confirmed', value: true });
  }

  // Track phrase completion
  if (workflow.currentPhase === 'understanding' && 
      (content.includes('next phrase') || content.includes('let\'s move to'))) {
    updates.push({ type: 'phrase_complete', value: workflow.currentPhrase });
  }

  return updates;
}

// Helper function to generate contextual response suggestions
async function generateResponseSuggestions(messages, workflow, verseData) {
  // Get the last assistant message to understand what's being asked
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'assistant') {
    return null;
  }

  const suggestions = [];
  
  // Generate context-specific suggestions based on workflow phase
  switch (workflow.currentPhase) {
    case 'planning':
      // Suggest common settings choices
      suggestions.push({
        text: "Use the default settings and begin",
        value: "1"
      });
      suggestions.push({
        text: "I'd like to customize the reading level and style",
        value: "Let me adjust the settings - I want Grade 3 reading level with a more dynamic style"
      });
      break;
      
    case 'understanding':
      // Suggest phrase-based responses
      const currentPhraseText = verseData?.phrases?.[workflow.currentPhrase];
      if (currentPhraseText) {
        // Simpler, more direct response
        suggestions.push({
          text: "It means " + generateSimpleExplanation(currentPhraseText),
          value: "I understand it as " + generateSimpleExplanation(currentPhraseText)
        });
        // More detailed response
        suggestions.push({
          text: "In our context, we'd say it like...",
          value: "In our culture, this would be expressed as " + generateContextualExpression(currentPhraseText)
        });
      }
      break;
      
    case 'drafting':
      suggestions.push({
        text: "This draft looks good to me",
        value: "I like this draft, let's move forward"
      });
      suggestions.push({
        text: "I'd like to adjust the wording",
        value: "Let me revise this - I think we should change..."
      });
      break;
      
    default:
      // Generic suggestions for unknown contexts
      suggestions.push({
        text: "Continue with the next step",
        value: "Yes, let's continue"
      });
      suggestions.push({
        text: "I need more explanation",
        value: "Can you explain that in more detail?"
      });
  }
  
  return suggestions;
}

// Simple helper to generate basic explanations (would be enhanced with actual LLM in production)
function generateSimpleExplanation(phrase) {
  // This is a placeholder - in production this would use the LLM
  const explanations = {
    "In the days when the judges ruled": "when leaders guided Israel",
    "there was a famine in the land": "there was no food available",
    "And a certain man from Bethlehem in Judah": "a man from the town of Bethlehem",
    "with his wife and two sons": "together with his family",
    "went to reside in the land of Moab": "moved to live in another country"
  };
  return explanations[phrase] || "what the text describes";
}

// Helper to generate contextual expressions
function generateContextualExpression(phrase) {
  // This is a placeholder - in production this would use the LLM
  const expressions = {
    "In the days when the judges ruled": "during the time of the early leaders",
    "there was a famine in the land": "when food became scarce everywhere",
    "And a certain man from Bethlehem in Judah": "there was this man from Bethlehem",
    "with his wife and two sons": "along with his whole family",
    "went to reside in the land of Moab": "had to move to a foreign place"
  };
  return expressions[phrase] || "the meaning of this phrase in our words";
}

const SYSTEM_PROMPT = `You are a conversational Bible translation assistant designed for end-to-end, iterative translation workflows. You guide users through a symbiotic process where you both teach and learn: you share trustworthy biblical background and methodology guidance, while collecting cultural and linguistic insights to tailor a draft and checks.

— What you do
• Start entirely in conversation. Proactively ask: language pair, reading level, register, and translation philosophy. By default, use:
- Language Pair: English → English
- Reading Level: Grade 1
- Style: Narrator, engaging tone
- Philosophy: Meaning-based

Build and maintain a personalized "scripture canvas" with four distinct artifacts:
1. Style Guide – translation principles, tone, reading level, preferences
2. Glossary – user-contributed insights, word choices, idioms, key terms
3. Scripture Canvas – translated text with notes and alternates
4. Feedback – community/peer comments linked to specific verses

• Orchestrate an iterative, six-phase flow:

1. Planning: Interview for style guide (grade level, key terms, preferences). Summarize back.
2. Understanding (FIA): Ask user if they prefer verse-by-verse or passage work. Then QUOTE THE SOURCE TEXT (e.g., BSB) FIRST. Guide through comprehension using questions only—no sample translations. Cover key ideas, names, places, relationships, events, cultural concepts. Collect user phrasing for glossary.
3. Drafting: Combine FIA learnings to propose initial draft based on user's input. Ask for confirmation/edits.
4. Checking: Run structured checks (translationNotes, questions, key terms). Highlight risks by severity.
5. Sharing/Feedback: Generate share text. Simulate reviewer feedback and help aggregate into revisions.
6. Publishing: Output clean chapter in "Bible app" format.

— Guardrails
• CRITICAL: In Understanding phase, ALWAYS present the verse text FIRST before asking questions
• Never suggest translations during Understanding—use open-ended questions to elicit user phrasing
• Work phrase-by-phrase through verses when in Understanding phase
• Keep explanations short, concrete, example-rich
• Ask one focused question at a time
• Prioritize reliability—prefer provided resources over assumptions
• Be sensitive to oral/low-literacy contexts

— Interaction style
• Warm, encouraging, concise. Use simple language (Grade 1 unless specified)
• For each phrase in Understanding: Present text → Ask comprehension → Collect user phrasing
• In Drafting: Offer (a) simpler wording, (b) literal variant, (c) notes on key terms
• Periodically reflect current style guide and glossary

— Current verse data
When working with Ruth 1:1, the verse breaks into these phrases:
1. "In the days when the judges ruled"
2. "there was a famine in the land"
3. "And a certain man from Bethlehem in Judah"
4. "with his wife and two sons"
5. "went to reside in the land of Moab"`;

export default async function handler(req, context) {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  try {
    const { messages, workflow, project, verseData } = await req.json();

    // Build comprehensive context for the system
    let workflowContext = `\n\nCurrent workflow state:
- Phase: ${workflow.currentPhase}
- Current verse: ${workflow.currentVerse}
- Current phrase index: ${workflow.currentPhrase || 0}
- Phrases completed: ${Object.keys(workflow.verseProgress || {}).length}`;

    // Add verse data if in Understanding phase
    if (workflow.currentPhase === "understanding" && verseData) {
      workflowContext += `\n\nVerse being translated (${verseData.reference}):
Full text: "${verseData.text}"
Phrases:
${verseData.phrases?.map((p, i) => `${i + 1}. "${p}"`).join("\n")}
Current phrase (${workflow.currentPhrase + 1}/${verseData.phrases?.length}): "${
        verseData.phrases?.[workflow.currentPhrase]
      }"`;
    }

    // Add workflow context to the system message
    const contextualizedMessages = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}${workflowContext}\n\nProject settings: ${JSON.stringify(
          project?.styleGuide || {}
        )}`,
      },
      ...messages,
    ];

    // Stream response from OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: contextualizedMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";
          
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          
          // Send structured updates based on the response
          const updates = extractStructuredUpdates(fullResponse, workflow);
          if (updates && updates.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ updates })}\n\n`));
          }
          
          // Generate and send response suggestions
          const suggestions = await generateResponseSuggestions(
            [...messages, { role: 'assistant', content: fullResponse }],
            workflow,
            verseData
          );
          if (suggestions && suggestions.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions })}\n\n`));
          }
          
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
}
