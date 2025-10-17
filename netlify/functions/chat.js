import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the Bible translation assistant
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
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
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
