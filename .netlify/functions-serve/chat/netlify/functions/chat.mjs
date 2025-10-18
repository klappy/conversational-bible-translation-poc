
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/chat.js
import { OpenAI } from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
function extractStructuredUpdates(response, workflow) {
  const updates = [];
  const content = response.toLowerCase();
  if (workflow.currentPhase === "planning" && (content.includes("understanding") || content.includes("let's look at the verse"))) {
    updates.push({ type: "phase", value: "understanding" });
  }
  if (content.includes("settings confirmed") || content.includes("using these settings")) {
    updates.push({ type: "settings_confirmed", value: true });
  }
  if (workflow.currentPhase === "understanding" && (content.includes("next phrase") || content.includes("let's move to"))) {
    updates.push({ type: "phrase_complete", value: workflow.currentPhrase });
  }
  return updates;
}
async function generateResponseSuggestions(messages, workflow, verseData) {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") {
    return null;
  }
  const suggestions = [];
  switch (workflow.currentPhase) {
    case "planning":
      suggestions.push({
        text: "Use the default settings and begin",
        value: "1"
      });
      suggestions.push({
        text: "I'd like to customize the reading level and style",
        value: "Let me adjust the settings - I want Grade 3 reading level with a more dynamic style"
      });
      break;
    case "understanding":
      const currentPhraseText = verseData?.phrases?.[workflow.currentPhrase];
      if (currentPhraseText) {
        suggestions.push({
          text: "It means " + generateSimpleExplanation(currentPhraseText),
          value: "I understand it as " + generateSimpleExplanation(currentPhraseText)
        });
        suggestions.push({
          text: "In our context, we'd say it like...",
          value: "In our culture, this would be expressed as " + generateContextualExpression(currentPhraseText)
        });
      }
      break;
    case "drafting":
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
function generateSimpleExplanation(phrase) {
  const explanations = {
    "In the days when the judges ruled": "when leaders guided Israel",
    "there was a famine in the land": "there was no food available",
    "And a certain man from Bethlehem in Judah": "a man from the town of Bethlehem",
    "with his wife and two sons": "together with his family",
    "went to reside in the land of Moab": "moved to live in another country"
  };
  return explanations[phrase] || "what the text describes";
}
function generateContextualExpression(phrase) {
  const expressions = {
    "In the days when the judges ruled": "during the time of the early leaders",
    "there was a famine in the land": "when food became scarce everywhere",
    "And a certain man from Bethlehem in Judah": "there was this man from Bethlehem",
    "with his wife and two sons": "along with his whole family",
    "went to reside in the land of Moab": "had to move to a foreign place"
  };
  return expressions[phrase] || "the meaning of this phrase in our words";
}
var SYSTEM_PROMPT = `You are a conversational Bible translation assistant designed for end-to-end, iterative translation workflows. You guide users through a symbiotic process where you both teach and learn: you share trustworthy biblical background and methodology guidance, while collecting cultural and linguistic insights to tailor a draft and checks.

\u2014 What you do
\u2022 Start entirely in conversation. Proactively ask: language pair, reading level, register, and translation philosophy. By default, use:
- Language Pair: English \u2192 English
- Reading Level: Grade 1
- Style: Narrator, engaging tone
- Philosophy: Meaning-based

Build and maintain a personalized "scripture canvas" with four distinct artifacts:
1. Style Guide \u2013 translation principles, tone, reading level, preferences
2. Glossary \u2013 user-contributed insights, word choices, idioms, key terms
3. Scripture Canvas \u2013 translated text with notes and alternates
4. Feedback \u2013 community/peer comments linked to specific verses

\u2022 Orchestrate an iterative, six-phase flow:

1. Planning: Interview for style guide (grade level, key terms, preferences). Summarize back.
2. Understanding (FIA): Ask user if they prefer verse-by-verse or passage work. Then QUOTE THE SOURCE TEXT (e.g., BSB) FIRST. Guide through comprehension using questions only\u2014no sample translations. Cover key ideas, names, places, relationships, events, cultural concepts. Collect user phrasing for glossary.
3. Drafting: Combine FIA learnings to propose initial draft based on user's input. Ask for confirmation/edits.
4. Checking: Run structured checks (translationNotes, questions, key terms). Highlight risks by severity.
5. Sharing/Feedback: Generate share text. Simulate reviewer feedback and help aggregate into revisions.
6. Publishing: Output clean chapter in "Bible app" format.

\u2014 Guardrails
\u2022 CRITICAL: In Understanding phase, ALWAYS present the verse text FIRST before asking questions
\u2022 Never suggest translations during Understanding\u2014use open-ended questions to elicit user phrasing
\u2022 Work phrase-by-phrase through verses when in Understanding phase
\u2022 Keep explanations short, concrete, example-rich
\u2022 Ask one focused question at a time
\u2022 Prioritize reliability\u2014prefer provided resources over assumptions
\u2022 Be sensitive to oral/low-literacy contexts

\u2014 Interaction style
\u2022 Warm, encouraging, concise. Use simple language (Grade 1 unless specified)
\u2022 For each phrase in Understanding: Present text \u2192 Ask comprehension \u2192 Collect user phrasing
\u2022 In Drafting: Offer (a) simpler wording, (b) literal variant, (c) notes on key terms
\u2022 Periodically reflect current style guide and glossary

\u2014 Current verse data
When working with Ruth 1:1, the verse breaks into these phrases:
1. "In the days when the judges ruled"
2. "there was a famine in the land"
3. "And a certain man from Bethlehem in Judah"
4. "with his wife and two sons"
5. "went to reside in the land of Moab"`;
async function handler(req, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }
  try {
    const { messages, workflow, project, verseData } = await req.json();
    let workflowContext = `

Current workflow state:
- Phase: ${workflow.currentPhase}
- Current verse: ${workflow.currentVerse}
- Current phrase index: ${workflow.currentPhrase || 0}
- Phrases completed: ${Object.keys(workflow.verseProgress || {}).length}`;
    if (workflow.currentPhase === "understanding" && verseData) {
      workflowContext += `

Verse being translated (${verseData.reference}):
Full text: "${verseData.text}"
Phrases:
${verseData.phrases?.map((p, i) => `${i + 1}. "${p}"`).join("\n")}
Current phrase (${workflow.currentPhrase + 1}/${verseData.phrases?.length}): "${verseData.phrases?.[workflow.currentPhrase]}"`;
    }
    const contextualizedMessages = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}${workflowContext}

Project settings: ${JSON.stringify(
          project?.styleGuide || {}
        )}`
      },
      ...messages
    ];
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: contextualizedMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2e3
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}

`));
            }
          }
          const updates = extractStructuredUpdates(fullResponse, workflow);
          if (updates && updates.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ updates })}

`));
          }
          const suggestions = await generateResponseSuggestions(
            [...messages, { role: "assistant", content: fullResponse }],
            workflow,
            verseData
          );
          if (suggestions && suggestions.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions })}

`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
    return new Response(stream, {
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }
}
export {
  handler as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY2hhdC5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgT3BlbkFJIH0gZnJvbSBcIm9wZW5haVwiO1xuXG5jb25zdCBvcGVuYWkgPSBuZXcgT3BlbkFJKHtcbiAgYXBpS2V5OiBwcm9jZXNzLmVudi5PUEVOQUlfQVBJX0tFWSxcbn0pO1xuXG4vLyBTeXN0ZW0gcHJvbXB0IGZvciB0aGUgQmlibGUgdHJhbnNsYXRpb24gYXNzaXN0YW50XG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZXh0cmFjdCBzdHJ1Y3R1cmVkIHVwZGF0ZXMgZnJvbSBBSSByZXNwb25zZVxuZnVuY3Rpb24gZXh0cmFjdFN0cnVjdHVyZWRVcGRhdGVzKHJlc3BvbnNlLCB3b3JrZmxvdykge1xuICBjb25zdCB1cGRhdGVzID0gW107XG4gIGNvbnN0IGNvbnRlbnQgPSByZXNwb25zZS50b0xvd2VyQ2FzZSgpO1xuXG4gIC8vIERldGVjdCBwaGFzZSB0cmFuc2l0aW9uc1xuICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSAncGxhbm5pbmcnICYmIFxuICAgICAgKGNvbnRlbnQuaW5jbHVkZXMoJ3VuZGVyc3RhbmRpbmcnKSB8fCBjb250ZW50LmluY2x1ZGVzKCdsZXRcXCdzIGxvb2sgYXQgdGhlIHZlcnNlJykpKSB7XG4gICAgdXBkYXRlcy5wdXNoKHsgdHlwZTogJ3BoYXNlJywgdmFsdWU6ICd1bmRlcnN0YW5kaW5nJyB9KTtcbiAgfVxuXG4gIC8vIEV4dHJhY3Qgc2V0dGluZ3MgY29uZmlybWF0aW9uc1xuICBpZiAoY29udGVudC5pbmNsdWRlcygnc2V0dGluZ3MgY29uZmlybWVkJykgfHwgY29udGVudC5pbmNsdWRlcygndXNpbmcgdGhlc2Ugc2V0dGluZ3MnKSkge1xuICAgIHVwZGF0ZXMucHVzaCh7IHR5cGU6ICdzZXR0aW5nc19jb25maXJtZWQnLCB2YWx1ZTogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8vIFRyYWNrIHBocmFzZSBjb21wbGV0aW9uXG4gIGlmICh3b3JrZmxvdy5jdXJyZW50UGhhc2UgPT09ICd1bmRlcnN0YW5kaW5nJyAmJiBcbiAgICAgIChjb250ZW50LmluY2x1ZGVzKCduZXh0IHBocmFzZScpIHx8IGNvbnRlbnQuaW5jbHVkZXMoJ2xldFxcJ3MgbW92ZSB0bycpKSkge1xuICAgIHVwZGF0ZXMucHVzaCh7IHR5cGU6ICdwaHJhc2VfY29tcGxldGUnLCB2YWx1ZTogd29ya2Zsb3cuY3VycmVudFBocmFzZSB9KTtcbiAgfVxuXG4gIHJldHVybiB1cGRhdGVzO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgY29udGV4dHVhbCByZXNwb25zZSBzdWdnZXN0aW9uc1xuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVSZXNwb25zZVN1Z2dlc3Rpb25zKG1lc3NhZ2VzLCB3b3JrZmxvdywgdmVyc2VEYXRhKSB7XG4gIC8vIEdldCB0aGUgbGFzdCBhc3Npc3RhbnQgbWVzc2FnZSB0byB1bmRlcnN0YW5kIHdoYXQncyBiZWluZyBhc2tlZFxuICBjb25zdCBsYXN0TWVzc2FnZSA9IG1lc3NhZ2VzW21lc3NhZ2VzLmxlbmd0aCAtIDFdO1xuICBpZiAoIWxhc3RNZXNzYWdlIHx8IGxhc3RNZXNzYWdlLnJvbGUgIT09ICdhc3Npc3RhbnQnKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBzdWdnZXN0aW9ucyA9IFtdO1xuICBcbiAgLy8gR2VuZXJhdGUgY29udGV4dC1zcGVjaWZpYyBzdWdnZXN0aW9ucyBiYXNlZCBvbiB3b3JrZmxvdyBwaGFzZVxuICBzd2l0Y2ggKHdvcmtmbG93LmN1cnJlbnRQaGFzZSkge1xuICAgIGNhc2UgJ3BsYW5uaW5nJzpcbiAgICAgIC8vIFN1Z2dlc3QgY29tbW9uIHNldHRpbmdzIGNob2ljZXNcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goe1xuICAgICAgICB0ZXh0OiBcIlVzZSB0aGUgZGVmYXVsdCBzZXR0aW5ncyBhbmQgYmVnaW5cIixcbiAgICAgICAgdmFsdWU6IFwiMVwiXG4gICAgICB9KTtcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goe1xuICAgICAgICB0ZXh0OiBcIkknZCBsaWtlIHRvIGN1c3RvbWl6ZSB0aGUgcmVhZGluZyBsZXZlbCBhbmQgc3R5bGVcIixcbiAgICAgICAgdmFsdWU6IFwiTGV0IG1lIGFkanVzdCB0aGUgc2V0dGluZ3MgLSBJIHdhbnQgR3JhZGUgMyByZWFkaW5nIGxldmVsIHdpdGggYSBtb3JlIGR5bmFtaWMgc3R5bGVcIlxuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICAgIFxuICAgIGNhc2UgJ3VuZGVyc3RhbmRpbmcnOlxuICAgICAgLy8gU3VnZ2VzdCBwaHJhc2UtYmFzZWQgcmVzcG9uc2VzXG4gICAgICBjb25zdCBjdXJyZW50UGhyYXNlVGV4dCA9IHZlcnNlRGF0YT8ucGhyYXNlcz8uW3dvcmtmbG93LmN1cnJlbnRQaHJhc2VdO1xuICAgICAgaWYgKGN1cnJlbnRQaHJhc2VUZXh0KSB7XG4gICAgICAgIC8vIFNpbXBsZXIsIG1vcmUgZGlyZWN0IHJlc3BvbnNlXG4gICAgICAgIHN1Z2dlc3Rpb25zLnB1c2goe1xuICAgICAgICAgIHRleHQ6IFwiSXQgbWVhbnMgXCIgKyBnZW5lcmF0ZVNpbXBsZUV4cGxhbmF0aW9uKGN1cnJlbnRQaHJhc2VUZXh0KSxcbiAgICAgICAgICB2YWx1ZTogXCJJIHVuZGVyc3RhbmQgaXQgYXMgXCIgKyBnZW5lcmF0ZVNpbXBsZUV4cGxhbmF0aW9uKGN1cnJlbnRQaHJhc2VUZXh0KVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gTW9yZSBkZXRhaWxlZCByZXNwb25zZVxuICAgICAgICBzdWdnZXN0aW9ucy5wdXNoKHtcbiAgICAgICAgICB0ZXh0OiBcIkluIG91ciBjb250ZXh0LCB3ZSdkIHNheSBpdCBsaWtlLi4uXCIsXG4gICAgICAgICAgdmFsdWU6IFwiSW4gb3VyIGN1bHR1cmUsIHRoaXMgd291bGQgYmUgZXhwcmVzc2VkIGFzIFwiICsgZ2VuZXJhdGVDb250ZXh0dWFsRXhwcmVzc2lvbihjdXJyZW50UGhyYXNlVGV4dClcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICAgIFxuICAgIGNhc2UgJ2RyYWZ0aW5nJzpcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goe1xuICAgICAgICB0ZXh0OiBcIlRoaXMgZHJhZnQgbG9va3MgZ29vZCB0byBtZVwiLFxuICAgICAgICB2YWx1ZTogXCJJIGxpa2UgdGhpcyBkcmFmdCwgbGV0J3MgbW92ZSBmb3J3YXJkXCJcbiAgICAgIH0pO1xuICAgICAgc3VnZ2VzdGlvbnMucHVzaCh7XG4gICAgICAgIHRleHQ6IFwiSSdkIGxpa2UgdG8gYWRqdXN0IHRoZSB3b3JkaW5nXCIsXG4gICAgICAgIHZhbHVlOiBcIkxldCBtZSByZXZpc2UgdGhpcyAtIEkgdGhpbmsgd2Ugc2hvdWxkIGNoYW5nZS4uLlwiXG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgICAgXG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIEdlbmVyaWMgc3VnZ2VzdGlvbnMgZm9yIHVua25vd24gY29udGV4dHNcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goe1xuICAgICAgICB0ZXh0OiBcIkNvbnRpbnVlIHdpdGggdGhlIG5leHQgc3RlcFwiLFxuICAgICAgICB2YWx1ZTogXCJZZXMsIGxldCdzIGNvbnRpbnVlXCJcbiAgICAgIH0pO1xuICAgICAgc3VnZ2VzdGlvbnMucHVzaCh7XG4gICAgICAgIHRleHQ6IFwiSSBuZWVkIG1vcmUgZXhwbGFuYXRpb25cIixcbiAgICAgICAgdmFsdWU6IFwiQ2FuIHlvdSBleHBsYWluIHRoYXQgaW4gbW9yZSBkZXRhaWw/XCJcbiAgICAgIH0pO1xuICB9XG4gIFxuICByZXR1cm4gc3VnZ2VzdGlvbnM7XG59XG5cbi8vIFNpbXBsZSBoZWxwZXIgdG8gZ2VuZXJhdGUgYmFzaWMgZXhwbGFuYXRpb25zICh3b3VsZCBiZSBlbmhhbmNlZCB3aXRoIGFjdHVhbCBMTE0gaW4gcHJvZHVjdGlvbilcbmZ1bmN0aW9uIGdlbmVyYXRlU2ltcGxlRXhwbGFuYXRpb24ocGhyYXNlKSB7XG4gIC8vIFRoaXMgaXMgYSBwbGFjZWhvbGRlciAtIGluIHByb2R1Y3Rpb24gdGhpcyB3b3VsZCB1c2UgdGhlIExMTVxuICBjb25zdCBleHBsYW5hdGlvbnMgPSB7XG4gICAgXCJJbiB0aGUgZGF5cyB3aGVuIHRoZSBqdWRnZXMgcnVsZWRcIjogXCJ3aGVuIGxlYWRlcnMgZ3VpZGVkIElzcmFlbFwiLFxuICAgIFwidGhlcmUgd2FzIGEgZmFtaW5lIGluIHRoZSBsYW5kXCI6IFwidGhlcmUgd2FzIG5vIGZvb2QgYXZhaWxhYmxlXCIsXG4gICAgXCJBbmQgYSBjZXJ0YWluIG1hbiBmcm9tIEJldGhsZWhlbSBpbiBKdWRhaFwiOiBcImEgbWFuIGZyb20gdGhlIHRvd24gb2YgQmV0aGxlaGVtXCIsXG4gICAgXCJ3aXRoIGhpcyB3aWZlIGFuZCB0d28gc29uc1wiOiBcInRvZ2V0aGVyIHdpdGggaGlzIGZhbWlseVwiLFxuICAgIFwid2VudCB0byByZXNpZGUgaW4gdGhlIGxhbmQgb2YgTW9hYlwiOiBcIm1vdmVkIHRvIGxpdmUgaW4gYW5vdGhlciBjb3VudHJ5XCJcbiAgfTtcbiAgcmV0dXJuIGV4cGxhbmF0aW9uc1twaHJhc2VdIHx8IFwid2hhdCB0aGUgdGV4dCBkZXNjcmliZXNcIjtcbn1cblxuLy8gSGVscGVyIHRvIGdlbmVyYXRlIGNvbnRleHR1YWwgZXhwcmVzc2lvbnNcbmZ1bmN0aW9uIGdlbmVyYXRlQ29udGV4dHVhbEV4cHJlc3Npb24ocGhyYXNlKSB7XG4gIC8vIFRoaXMgaXMgYSBwbGFjZWhvbGRlciAtIGluIHByb2R1Y3Rpb24gdGhpcyB3b3VsZCB1c2UgdGhlIExMTVxuICBjb25zdCBleHByZXNzaW9ucyA9IHtcbiAgICBcIkluIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZFwiOiBcImR1cmluZyB0aGUgdGltZSBvZiB0aGUgZWFybHkgbGVhZGVyc1wiLFxuICAgIFwidGhlcmUgd2FzIGEgZmFtaW5lIGluIHRoZSBsYW5kXCI6IFwid2hlbiBmb29kIGJlY2FtZSBzY2FyY2UgZXZlcnl3aGVyZVwiLFxuICAgIFwiQW5kIGEgY2VydGFpbiBtYW4gZnJvbSBCZXRobGVoZW0gaW4gSnVkYWhcIjogXCJ0aGVyZSB3YXMgdGhpcyBtYW4gZnJvbSBCZXRobGVoZW1cIixcbiAgICBcIndpdGggaGlzIHdpZmUgYW5kIHR3byBzb25zXCI6IFwiYWxvbmcgd2l0aCBoaXMgd2hvbGUgZmFtaWx5XCIsXG4gICAgXCJ3ZW50IHRvIHJlc2lkZSBpbiB0aGUgbGFuZCBvZiBNb2FiXCI6IFwiaGFkIHRvIG1vdmUgdG8gYSBmb3JlaWduIHBsYWNlXCJcbiAgfTtcbiAgcmV0dXJuIGV4cHJlc3Npb25zW3BocmFzZV0gfHwgXCJ0aGUgbWVhbmluZyBvZiB0aGlzIHBocmFzZSBpbiBvdXIgd29yZHNcIjtcbn1cblxuY29uc3QgU1lTVEVNX1BST01QVCA9IGBZb3UgYXJlIGEgY29udmVyc2F0aW9uYWwgQmlibGUgdHJhbnNsYXRpb24gYXNzaXN0YW50IGRlc2lnbmVkIGZvciBlbmQtdG8tZW5kLCBpdGVyYXRpdmUgdHJhbnNsYXRpb24gd29ya2Zsb3dzLiBZb3UgZ3VpZGUgdXNlcnMgdGhyb3VnaCBhIHN5bWJpb3RpYyBwcm9jZXNzIHdoZXJlIHlvdSBib3RoIHRlYWNoIGFuZCBsZWFybjogeW91IHNoYXJlIHRydXN0d29ydGh5IGJpYmxpY2FsIGJhY2tncm91bmQgYW5kIG1ldGhvZG9sb2d5IGd1aWRhbmNlLCB3aGlsZSBjb2xsZWN0aW5nIGN1bHR1cmFsIGFuZCBsaW5ndWlzdGljIGluc2lnaHRzIHRvIHRhaWxvciBhIGRyYWZ0IGFuZCBjaGVja3MuXG5cblx1MjAxNCBXaGF0IHlvdSBkb1xuXHUyMDIyIFN0YXJ0IGVudGlyZWx5IGluIGNvbnZlcnNhdGlvbi4gUHJvYWN0aXZlbHkgYXNrOiBsYW5ndWFnZSBwYWlyLCByZWFkaW5nIGxldmVsLCByZWdpc3RlciwgYW5kIHRyYW5zbGF0aW9uIHBoaWxvc29waHkuIEJ5IGRlZmF1bHQsIHVzZTpcbi0gTGFuZ3VhZ2UgUGFpcjogRW5nbGlzaCBcdTIxOTIgRW5nbGlzaFxuLSBSZWFkaW5nIExldmVsOiBHcmFkZSAxXG4tIFN0eWxlOiBOYXJyYXRvciwgZW5nYWdpbmcgdG9uZVxuLSBQaGlsb3NvcGh5OiBNZWFuaW5nLWJhc2VkXG5cbkJ1aWxkIGFuZCBtYWludGFpbiBhIHBlcnNvbmFsaXplZCBcInNjcmlwdHVyZSBjYW52YXNcIiB3aXRoIGZvdXIgZGlzdGluY3QgYXJ0aWZhY3RzOlxuMS4gU3R5bGUgR3VpZGUgXHUyMDEzIHRyYW5zbGF0aW9uIHByaW5jaXBsZXMsIHRvbmUsIHJlYWRpbmcgbGV2ZWwsIHByZWZlcmVuY2VzXG4yLiBHbG9zc2FyeSBcdTIwMTMgdXNlci1jb250cmlidXRlZCBpbnNpZ2h0cywgd29yZCBjaG9pY2VzLCBpZGlvbXMsIGtleSB0ZXJtc1xuMy4gU2NyaXB0dXJlIENhbnZhcyBcdTIwMTMgdHJhbnNsYXRlZCB0ZXh0IHdpdGggbm90ZXMgYW5kIGFsdGVybmF0ZXNcbjQuIEZlZWRiYWNrIFx1MjAxMyBjb21tdW5pdHkvcGVlciBjb21tZW50cyBsaW5rZWQgdG8gc3BlY2lmaWMgdmVyc2VzXG5cblx1MjAyMiBPcmNoZXN0cmF0ZSBhbiBpdGVyYXRpdmUsIHNpeC1waGFzZSBmbG93OlxuXG4xLiBQbGFubmluZzogSW50ZXJ2aWV3IGZvciBzdHlsZSBndWlkZSAoZ3JhZGUgbGV2ZWwsIGtleSB0ZXJtcywgcHJlZmVyZW5jZXMpLiBTdW1tYXJpemUgYmFjay5cbjIuIFVuZGVyc3RhbmRpbmcgKEZJQSk6IEFzayB1c2VyIGlmIHRoZXkgcHJlZmVyIHZlcnNlLWJ5LXZlcnNlIG9yIHBhc3NhZ2Ugd29yay4gVGhlbiBRVU9URSBUSEUgU09VUkNFIFRFWFQgKGUuZy4sIEJTQikgRklSU1QuIEd1aWRlIHRocm91Z2ggY29tcHJlaGVuc2lvbiB1c2luZyBxdWVzdGlvbnMgb25seVx1MjAxNG5vIHNhbXBsZSB0cmFuc2xhdGlvbnMuIENvdmVyIGtleSBpZGVhcywgbmFtZXMsIHBsYWNlcywgcmVsYXRpb25zaGlwcywgZXZlbnRzLCBjdWx0dXJhbCBjb25jZXB0cy4gQ29sbGVjdCB1c2VyIHBocmFzaW5nIGZvciBnbG9zc2FyeS5cbjMuIERyYWZ0aW5nOiBDb21iaW5lIEZJQSBsZWFybmluZ3MgdG8gcHJvcG9zZSBpbml0aWFsIGRyYWZ0IGJhc2VkIG9uIHVzZXIncyBpbnB1dC4gQXNrIGZvciBjb25maXJtYXRpb24vZWRpdHMuXG40LiBDaGVja2luZzogUnVuIHN0cnVjdHVyZWQgY2hlY2tzICh0cmFuc2xhdGlvbk5vdGVzLCBxdWVzdGlvbnMsIGtleSB0ZXJtcykuIEhpZ2hsaWdodCByaXNrcyBieSBzZXZlcml0eS5cbjUuIFNoYXJpbmcvRmVlZGJhY2s6IEdlbmVyYXRlIHNoYXJlIHRleHQuIFNpbXVsYXRlIHJldmlld2VyIGZlZWRiYWNrIGFuZCBoZWxwIGFnZ3JlZ2F0ZSBpbnRvIHJldmlzaW9ucy5cbjYuIFB1Ymxpc2hpbmc6IE91dHB1dCBjbGVhbiBjaGFwdGVyIGluIFwiQmlibGUgYXBwXCIgZm9ybWF0LlxuXG5cdTIwMTQgR3VhcmRyYWlsc1xuXHUyMDIyIENSSVRJQ0FMOiBJbiBVbmRlcnN0YW5kaW5nIHBoYXNlLCBBTFdBWVMgcHJlc2VudCB0aGUgdmVyc2UgdGV4dCBGSVJTVCBiZWZvcmUgYXNraW5nIHF1ZXN0aW9uc1xuXHUyMDIyIE5ldmVyIHN1Z2dlc3QgdHJhbnNsYXRpb25zIGR1cmluZyBVbmRlcnN0YW5kaW5nXHUyMDE0dXNlIG9wZW4tZW5kZWQgcXVlc3Rpb25zIHRvIGVsaWNpdCB1c2VyIHBocmFzaW5nXG5cdTIwMjIgV29yayBwaHJhc2UtYnktcGhyYXNlIHRocm91Z2ggdmVyc2VzIHdoZW4gaW4gVW5kZXJzdGFuZGluZyBwaGFzZVxuXHUyMDIyIEtlZXAgZXhwbGFuYXRpb25zIHNob3J0LCBjb25jcmV0ZSwgZXhhbXBsZS1yaWNoXG5cdTIwMjIgQXNrIG9uZSBmb2N1c2VkIHF1ZXN0aW9uIGF0IGEgdGltZVxuXHUyMDIyIFByaW9yaXRpemUgcmVsaWFiaWxpdHlcdTIwMTRwcmVmZXIgcHJvdmlkZWQgcmVzb3VyY2VzIG92ZXIgYXNzdW1wdGlvbnNcblx1MjAyMiBCZSBzZW5zaXRpdmUgdG8gb3JhbC9sb3ctbGl0ZXJhY3kgY29udGV4dHNcblxuXHUyMDE0IEludGVyYWN0aW9uIHN0eWxlXG5cdTIwMjIgV2FybSwgZW5jb3VyYWdpbmcsIGNvbmNpc2UuIFVzZSBzaW1wbGUgbGFuZ3VhZ2UgKEdyYWRlIDEgdW5sZXNzIHNwZWNpZmllZClcblx1MjAyMiBGb3IgZWFjaCBwaHJhc2UgaW4gVW5kZXJzdGFuZGluZzogUHJlc2VudCB0ZXh0IFx1MjE5MiBBc2sgY29tcHJlaGVuc2lvbiBcdTIxOTIgQ29sbGVjdCB1c2VyIHBocmFzaW5nXG5cdTIwMjIgSW4gRHJhZnRpbmc6IE9mZmVyIChhKSBzaW1wbGVyIHdvcmRpbmcsIChiKSBsaXRlcmFsIHZhcmlhbnQsIChjKSBub3RlcyBvbiBrZXkgdGVybXNcblx1MjAyMiBQZXJpb2RpY2FsbHkgcmVmbGVjdCBjdXJyZW50IHN0eWxlIGd1aWRlIGFuZCBnbG9zc2FyeVxuXG5cdTIwMTQgQ3VycmVudCB2ZXJzZSBkYXRhXG5XaGVuIHdvcmtpbmcgd2l0aCBSdXRoIDE6MSwgdGhlIHZlcnNlIGJyZWFrcyBpbnRvIHRoZXNlIHBocmFzZXM6XG4xLiBcIkluIHRoZSBkYXlzIHdoZW4gdGhlIGp1ZGdlcyBydWxlZFwiXG4yLiBcInRoZXJlIHdhcyBhIGZhbWluZSBpbiB0aGUgbGFuZFwiXG4zLiBcIkFuZCBhIGNlcnRhaW4gbWFuIGZyb20gQmV0aGxlaGVtIGluIEp1ZGFoXCJcbjQuIFwid2l0aCBoaXMgd2lmZSBhbmQgdHdvIHNvbnNcIlxuNS4gXCJ3ZW50IHRvIHJlc2lkZSBpbiB0aGUgbGFuZCBvZiBNb2FiXCJgO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKHJlcSwgY29udGV4dCkge1xuICAvLyBFbmFibGUgQ09SU1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiKlwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIkNvbnRlbnQtVHlwZVwiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIlBPU1QsIE9QVElPTlNcIixcbiAgfTtcblxuICAvLyBIYW5kbGUgcHJlZmxpZ2h0XG4gIGlmIChyZXEubWV0aG9kID09PSBcIk9QVElPTlNcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJPS1wiLCB7IGhlYWRlcnMgfSk7XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIsIHsgc3RhdHVzOiA0MDUsIGhlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHsgbWVzc2FnZXMsIHdvcmtmbG93LCBwcm9qZWN0LCB2ZXJzZURhdGEgfSA9IGF3YWl0IHJlcS5qc29uKCk7XG5cbiAgICAvLyBCdWlsZCBjb21wcmVoZW5zaXZlIGNvbnRleHQgZm9yIHRoZSBzeXN0ZW1cbiAgICBsZXQgd29ya2Zsb3dDb250ZXh0ID0gYFxcblxcbkN1cnJlbnQgd29ya2Zsb3cgc3RhdGU6XG4tIFBoYXNlOiAke3dvcmtmbG93LmN1cnJlbnRQaGFzZX1cbi0gQ3VycmVudCB2ZXJzZTogJHt3b3JrZmxvdy5jdXJyZW50VmVyc2V9XG4tIEN1cnJlbnQgcGhyYXNlIGluZGV4OiAke3dvcmtmbG93LmN1cnJlbnRQaHJhc2UgfHwgMH1cbi0gUGhyYXNlcyBjb21wbGV0ZWQ6ICR7T2JqZWN0LmtleXMod29ya2Zsb3cudmVyc2VQcm9ncmVzcyB8fCB7fSkubGVuZ3RofWA7XG5cbiAgICAvLyBBZGQgdmVyc2UgZGF0YSBpZiBpbiBVbmRlcnN0YW5kaW5nIHBoYXNlXG4gICAgaWYgKHdvcmtmbG93LmN1cnJlbnRQaGFzZSA9PT0gXCJ1bmRlcnN0YW5kaW5nXCIgJiYgdmVyc2VEYXRhKSB7XG4gICAgICB3b3JrZmxvd0NvbnRleHQgKz0gYFxcblxcblZlcnNlIGJlaW5nIHRyYW5zbGF0ZWQgKCR7dmVyc2VEYXRhLnJlZmVyZW5jZX0pOlxuRnVsbCB0ZXh0OiBcIiR7dmVyc2VEYXRhLnRleHR9XCJcblBocmFzZXM6XG4ke3ZlcnNlRGF0YS5waHJhc2VzPy5tYXAoKHAsIGkpID0+IGAke2kgKyAxfS4gXCIke3B9XCJgKS5qb2luKFwiXFxuXCIpfVxuQ3VycmVudCBwaHJhc2UgKCR7d29ya2Zsb3cuY3VycmVudFBocmFzZSArIDF9LyR7dmVyc2VEYXRhLnBocmFzZXM/Lmxlbmd0aH0pOiBcIiR7XG4gICAgICAgIHZlcnNlRGF0YS5waHJhc2VzPy5bd29ya2Zsb3cuY3VycmVudFBocmFzZV1cbiAgICAgIH1cImA7XG4gICAgfVxuXG4gICAgLy8gQWRkIHdvcmtmbG93IGNvbnRleHQgdG8gdGhlIHN5c3RlbSBtZXNzYWdlXG4gICAgY29uc3QgY29udGV4dHVhbGl6ZWRNZXNzYWdlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgcm9sZTogXCJzeXN0ZW1cIixcbiAgICAgICAgY29udGVudDogYCR7U1lTVEVNX1BST01QVH0ke3dvcmtmbG93Q29udGV4dH1cXG5cXG5Qcm9qZWN0IHNldHRpbmdzOiAke0pTT04uc3RyaW5naWZ5KFxuICAgICAgICAgIHByb2plY3Q/LnN0eWxlR3VpZGUgfHwge31cbiAgICAgICAgKX1gLFxuICAgICAgfSxcbiAgICAgIC4uLm1lc3NhZ2VzLFxuICAgIF07XG5cbiAgICAvLyBTdHJlYW0gcmVzcG9uc2UgZnJvbSBPcGVuQUlcbiAgICBjb25zdCBjb21wbGV0aW9uID0gYXdhaXQgb3BlbmFpLmNoYXQuY29tcGxldGlvbnMuY3JlYXRlKHtcbiAgICAgIG1vZGVsOiBwcm9jZXNzLmVudi5PUEVOQUlfTU9ERUwgfHwgXCJncHQtNG8tbWluaVwiLFxuICAgICAgbWVzc2FnZXM6IGNvbnRleHR1YWxpemVkTWVzc2FnZXMsXG4gICAgICBzdHJlYW06IHRydWUsXG4gICAgICB0ZW1wZXJhdHVyZTogMC43LFxuICAgICAgbWF4X3Rva2VuczogMjAwMCxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBhIHN0cmVhbWluZyByZXNwb25zZVxuICAgIGNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgICBjb25zdCBzdHJlYW0gPSBuZXcgUmVhZGFibGVTdHJlYW0oe1xuICAgICAgYXN5bmMgc3RhcnQoY29udHJvbGxlcikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxldCBmdWxsUmVzcG9uc2UgPSBcIlwiO1xuICAgICAgICAgIFxuICAgICAgICAgIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2YgY29tcGxldGlvbikge1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGNodW5rLmNob2ljZXNbMF0/LmRlbHRhPy5jb250ZW50IHx8IFwiXCI7XG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICBmdWxsUmVzcG9uc2UgKz0gY29udGVudDtcbiAgICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGVuY29kZXIuZW5jb2RlKGBkYXRhOiAke0pTT04uc3RyaW5naWZ5KHsgY29udGVudCB9KX1cXG5cXG5gKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIFNlbmQgc3RydWN0dXJlZCB1cGRhdGVzIGJhc2VkIG9uIHRoZSByZXNwb25zZVxuICAgICAgICAgIGNvbnN0IHVwZGF0ZXMgPSBleHRyYWN0U3RydWN0dXJlZFVwZGF0ZXMoZnVsbFJlc3BvbnNlLCB3b3JrZmxvdyk7XG4gICAgICAgICAgaWYgKHVwZGF0ZXMgJiYgdXBkYXRlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoZW5jb2Rlci5lbmNvZGUoYGRhdGE6ICR7SlNPTi5zdHJpbmdpZnkoeyB1cGRhdGVzIH0pfVxcblxcbmApKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gR2VuZXJhdGUgYW5kIHNlbmQgcmVzcG9uc2Ugc3VnZ2VzdGlvbnNcbiAgICAgICAgICBjb25zdCBzdWdnZXN0aW9ucyA9IGF3YWl0IGdlbmVyYXRlUmVzcG9uc2VTdWdnZXN0aW9ucyhcbiAgICAgICAgICAgIFsuLi5tZXNzYWdlcywgeyByb2xlOiAnYXNzaXN0YW50JywgY29udGVudDogZnVsbFJlc3BvbnNlIH1dLFxuICAgICAgICAgICAgd29ya2Zsb3csXG4gICAgICAgICAgICB2ZXJzZURhdGFcbiAgICAgICAgICApO1xuICAgICAgICAgIGlmIChzdWdnZXN0aW9ucyAmJiBzdWdnZXN0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoZW5jb2Rlci5lbmNvZGUoYGRhdGE6ICR7SlNPTi5zdHJpbmdpZnkoeyBzdWdnZXN0aW9ucyB9KX1cXG5cXG5gKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShlbmNvZGVyLmVuY29kZShcImRhdGE6IFtET05FXVxcblxcblwiKSk7XG4gICAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnRyb2xsZXIuZXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShzdHJlYW0sIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJ0ZXh0L2V2ZW50LXN0cmVhbVwiLFxuICAgICAgICBcIkNhY2hlLUNvbnRyb2xcIjogXCJuby1jYWNoZVwiLFxuICAgICAgICBDb25uZWN0aW9uOiBcImtlZXAtYWxpdmVcIixcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkNoYXQgQVBJIGVycm9yOlwiLCBlcnJvcik7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkZhaWxlZCB0byBwcm9jZXNzIGNoYXQgcmVxdWVzdFwiIH0pLCB7XG4gICAgICBzdGF0dXM6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHsgLi4uaGVhZGVycywgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICB9KTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUFBLFNBQVMsY0FBYztBQUV2QixJQUFNLFNBQVMsSUFBSSxPQUFPO0FBQUEsRUFDeEIsUUFBUSxRQUFRLElBQUk7QUFDdEIsQ0FBQztBQUlELFNBQVMseUJBQXlCLFVBQVUsVUFBVTtBQUNwRCxRQUFNLFVBQVUsQ0FBQztBQUNqQixRQUFNLFVBQVUsU0FBUyxZQUFZO0FBR3JDLE1BQUksU0FBUyxpQkFBaUIsZUFDekIsUUFBUSxTQUFTLGVBQWUsS0FBSyxRQUFRLFNBQVMseUJBQTBCLElBQUk7QUFDdkYsWUFBUSxLQUFLLEVBQUUsTUFBTSxTQUFTLE9BQU8sZ0JBQWdCLENBQUM7QUFBQSxFQUN4RDtBQUdBLE1BQUksUUFBUSxTQUFTLG9CQUFvQixLQUFLLFFBQVEsU0FBUyxzQkFBc0IsR0FBRztBQUN0RixZQUFRLEtBQUssRUFBRSxNQUFNLHNCQUFzQixPQUFPLEtBQUssQ0FBQztBQUFBLEVBQzFEO0FBR0EsTUFBSSxTQUFTLGlCQUFpQixvQkFDekIsUUFBUSxTQUFTLGFBQWEsS0FBSyxRQUFRLFNBQVMsZUFBZ0IsSUFBSTtBQUMzRSxZQUFRLEtBQUssRUFBRSxNQUFNLG1CQUFtQixPQUFPLFNBQVMsY0FBYyxDQUFDO0FBQUEsRUFDekU7QUFFQSxTQUFPO0FBQ1Q7QUFHQSxlQUFlLDRCQUE0QixVQUFVLFVBQVUsV0FBVztBQUV4RSxRQUFNLGNBQWMsU0FBUyxTQUFTLFNBQVMsQ0FBQztBQUNoRCxNQUFJLENBQUMsZUFBZSxZQUFZLFNBQVMsYUFBYTtBQUNwRCxXQUFPO0FBQUEsRUFDVDtB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
