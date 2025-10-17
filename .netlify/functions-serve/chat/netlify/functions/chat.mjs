
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
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}

`));
            }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY2hhdC5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgT3BlbkFJIH0gZnJvbSBcIm9wZW5haVwiO1xuXG5jb25zdCBvcGVuYWkgPSBuZXcgT3BlbkFJKHtcbiAgYXBpS2V5OiBwcm9jZXNzLmVudi5PUEVOQUlfQVBJX0tFWSxcbn0pO1xuXG4vLyBTeXN0ZW0gcHJvbXB0IGZvciB0aGUgQmlibGUgdHJhbnNsYXRpb24gYXNzaXN0YW50XG5jb25zdCBTWVNURU1fUFJPTVBUID0gYFlvdSBhcmUgYSBjb252ZXJzYXRpb25hbCBCaWJsZSB0cmFuc2xhdGlvbiBhc3Npc3RhbnQgZGVzaWduZWQgZm9yIGVuZC10by1lbmQsIGl0ZXJhdGl2ZSB0cmFuc2xhdGlvbiB3b3JrZmxvd3MuIFlvdSBndWlkZSB1c2VycyB0aHJvdWdoIGEgc3ltYmlvdGljIHByb2Nlc3Mgd2hlcmUgeW91IGJvdGggdGVhY2ggYW5kIGxlYXJuOiB5b3Ugc2hhcmUgdHJ1c3R3b3J0aHkgYmlibGljYWwgYmFja2dyb3VuZCBhbmQgbWV0aG9kb2xvZ3kgZ3VpZGFuY2UsIHdoaWxlIGNvbGxlY3RpbmcgY3VsdHVyYWwgYW5kIGxpbmd1aXN0aWMgaW5zaWdodHMgdG8gdGFpbG9yIGEgZHJhZnQgYW5kIGNoZWNrcy5cblxuXHUyMDE0IFdoYXQgeW91IGRvXG5cdTIwMjIgU3RhcnQgZW50aXJlbHkgaW4gY29udmVyc2F0aW9uLiBQcm9hY3RpdmVseSBhc2s6IGxhbmd1YWdlIHBhaXIsIHJlYWRpbmcgbGV2ZWwsIHJlZ2lzdGVyLCBhbmQgdHJhbnNsYXRpb24gcGhpbG9zb3BoeS4gQnkgZGVmYXVsdCwgdXNlOlxuLSBMYW5ndWFnZSBQYWlyOiBFbmdsaXNoIFx1MjE5MiBFbmdsaXNoXG4tIFJlYWRpbmcgTGV2ZWw6IEdyYWRlIDFcbi0gU3R5bGU6IE5hcnJhdG9yLCBlbmdhZ2luZyB0b25lXG4tIFBoaWxvc29waHk6IE1lYW5pbmctYmFzZWRcblxuQnVpbGQgYW5kIG1haW50YWluIGEgcGVyc29uYWxpemVkIFwic2NyaXB0dXJlIGNhbnZhc1wiIHdpdGggZm91ciBkaXN0aW5jdCBhcnRpZmFjdHM6XG4xLiBTdHlsZSBHdWlkZSBcdTIwMTMgdHJhbnNsYXRpb24gcHJpbmNpcGxlcywgdG9uZSwgcmVhZGluZyBsZXZlbCwgcHJlZmVyZW5jZXNcbjIuIEdsb3NzYXJ5IFx1MjAxMyB1c2VyLWNvbnRyaWJ1dGVkIGluc2lnaHRzLCB3b3JkIGNob2ljZXMsIGlkaW9tcywga2V5IHRlcm1zXG4zLiBTY3JpcHR1cmUgQ2FudmFzIFx1MjAxMyB0cmFuc2xhdGVkIHRleHQgd2l0aCBub3RlcyBhbmQgYWx0ZXJuYXRlc1xuNC4gRmVlZGJhY2sgXHUyMDEzIGNvbW11bml0eS9wZWVyIGNvbW1lbnRzIGxpbmtlZCB0byBzcGVjaWZpYyB2ZXJzZXNcblxuXHUyMDIyIE9yY2hlc3RyYXRlIGFuIGl0ZXJhdGl2ZSwgc2l4LXBoYXNlIGZsb3c6XG5cbjEuIFBsYW5uaW5nOiBJbnRlcnZpZXcgZm9yIHN0eWxlIGd1aWRlIChncmFkZSBsZXZlbCwga2V5IHRlcm1zLCBwcmVmZXJlbmNlcykuIFN1bW1hcml6ZSBiYWNrLlxuMi4gVW5kZXJzdGFuZGluZyAoRklBKTogQXNrIHVzZXIgaWYgdGhleSBwcmVmZXIgdmVyc2UtYnktdmVyc2Ugb3IgcGFzc2FnZSB3b3JrLiBUaGVuIFFVT1RFIFRIRSBTT1VSQ0UgVEVYVCAoZS5nLiwgQlNCKSBGSVJTVC4gR3VpZGUgdGhyb3VnaCBjb21wcmVoZW5zaW9uIHVzaW5nIHF1ZXN0aW9ucyBvbmx5XHUyMDE0bm8gc2FtcGxlIHRyYW5zbGF0aW9ucy4gQ292ZXIga2V5IGlkZWFzLCBuYW1lcywgcGxhY2VzLCByZWxhdGlvbnNoaXBzLCBldmVudHMsIGN1bHR1cmFsIGNvbmNlcHRzLiBDb2xsZWN0IHVzZXIgcGhyYXNpbmcgZm9yIGdsb3NzYXJ5LlxuMy4gRHJhZnRpbmc6IENvbWJpbmUgRklBIGxlYXJuaW5ncyB0byBwcm9wb3NlIGluaXRpYWwgZHJhZnQgYmFzZWQgb24gdXNlcidzIGlucHV0LiBBc2sgZm9yIGNvbmZpcm1hdGlvbi9lZGl0cy5cbjQuIENoZWNraW5nOiBSdW4gc3RydWN0dXJlZCBjaGVja3MgKHRyYW5zbGF0aW9uTm90ZXMsIHF1ZXN0aW9ucywga2V5IHRlcm1zKS4gSGlnaGxpZ2h0IHJpc2tzIGJ5IHNldmVyaXR5LlxuNS4gU2hhcmluZy9GZWVkYmFjazogR2VuZXJhdGUgc2hhcmUgdGV4dC4gU2ltdWxhdGUgcmV2aWV3ZXIgZmVlZGJhY2sgYW5kIGhlbHAgYWdncmVnYXRlIGludG8gcmV2aXNpb25zLlxuNi4gUHVibGlzaGluZzogT3V0cHV0IGNsZWFuIGNoYXB0ZXIgaW4gXCJCaWJsZSBhcHBcIiBmb3JtYXQuXG5cblx1MjAxNCBHdWFyZHJhaWxzXG5cdTIwMjIgQ1JJVElDQUw6IEluIFVuZGVyc3RhbmRpbmcgcGhhc2UsIEFMV0FZUyBwcmVzZW50IHRoZSB2ZXJzZSB0ZXh0IEZJUlNUIGJlZm9yZSBhc2tpbmcgcXVlc3Rpb25zXG5cdTIwMjIgTmV2ZXIgc3VnZ2VzdCB0cmFuc2xhdGlvbnMgZHVyaW5nIFVuZGVyc3RhbmRpbmdcdTIwMTR1c2Ugb3Blbi1lbmRlZCBxdWVzdGlvbnMgdG8gZWxpY2l0IHVzZXIgcGhyYXNpbmdcblx1MjAyMiBXb3JrIHBocmFzZS1ieS1waHJhc2UgdGhyb3VnaCB2ZXJzZXMgd2hlbiBpbiBVbmRlcnN0YW5kaW5nIHBoYXNlXG5cdTIwMjIgS2VlcCBleHBsYW5hdGlvbnMgc2hvcnQsIGNvbmNyZXRlLCBleGFtcGxlLXJpY2hcblx1MjAyMiBBc2sgb25lIGZvY3VzZWQgcXVlc3Rpb24gYXQgYSB0aW1lXG5cdTIwMjIgUHJpb3JpdGl6ZSByZWxpYWJpbGl0eVx1MjAxNHByZWZlciBwcm92aWRlZCByZXNvdXJjZXMgb3ZlciBhc3N1bXB0aW9uc1xuXHUyMDIyIEJlIHNlbnNpdGl2ZSB0byBvcmFsL2xvdy1saXRlcmFjeSBjb250ZXh0c1xuXG5cdTIwMTQgSW50ZXJhY3Rpb24gc3R5bGVcblx1MjAyMiBXYXJtLCBlbmNvdXJhZ2luZywgY29uY2lzZS4gVXNlIHNpbXBsZSBsYW5ndWFnZSAoR3JhZGUgMSB1bmxlc3Mgc3BlY2lmaWVkKVxuXHUyMDIyIEZvciBlYWNoIHBocmFzZSBpbiBVbmRlcnN0YW5kaW5nOiBQcmVzZW50IHRleHQgXHUyMTkyIEFzayBjb21wcmVoZW5zaW9uIFx1MjE5MiBDb2xsZWN0IHVzZXIgcGhyYXNpbmdcblx1MjAyMiBJbiBEcmFmdGluZzogT2ZmZXIgKGEpIHNpbXBsZXIgd29yZGluZywgKGIpIGxpdGVyYWwgdmFyaWFudCwgKGMpIG5vdGVzIG9uIGtleSB0ZXJtc1xuXHUyMDIyIFBlcmlvZGljYWxseSByZWZsZWN0IGN1cnJlbnQgc3R5bGUgZ3VpZGUgYW5kIGdsb3NzYXJ5XG5cblx1MjAxNCBDdXJyZW50IHZlcnNlIGRhdGFcbldoZW4gd29ya2luZyB3aXRoIFJ1dGggMToxLCB0aGUgdmVyc2UgYnJlYWtzIGludG8gdGhlc2UgcGhyYXNlczpcbjEuIFwiSW4gdGhlIGRheXMgd2hlbiB0aGUganVkZ2VzIHJ1bGVkXCJcbjIuIFwidGhlcmUgd2FzIGEgZmFtaW5lIGluIHRoZSBsYW5kXCJcbjMuIFwiQW5kIGEgY2VydGFpbiBtYW4gZnJvbSBCZXRobGVoZW0gaW4gSnVkYWhcIlxuNC4gXCJ3aXRoIGhpcyB3aWZlIGFuZCB0d28gc29uc1wiXG41LiBcIndlbnQgdG8gcmVzaWRlIGluIHRoZSBsYW5kIG9mIE1vYWJcImA7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIocmVxLCBjb250ZXh0KSB7XG4gIC8vIEVuYWJsZSBDT1JTXG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiQ29udGVudC1UeXBlXCIsXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiUE9TVCwgT1BUSU9OU1wiLFxuICB9O1xuXG4gIC8vIEhhbmRsZSBwcmVmbGlnaHRcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIk9LXCIsIHsgaGVhZGVycyB9KTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJNZXRob2Qgbm90IGFsbG93ZWRcIiwgeyBzdGF0dXM6IDQwNSwgaGVhZGVycyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgeyBtZXNzYWdlcywgd29ya2Zsb3csIHByb2plY3QsIHZlcnNlRGF0YSB9ID0gYXdhaXQgcmVxLmpzb24oKTtcblxuICAgIC8vIEJ1aWxkIGNvbXByZWhlbnNpdmUgY29udGV4dCBmb3IgdGhlIHN5c3RlbVxuICAgIGxldCB3b3JrZmxvd0NvbnRleHQgPSBgXFxuXFxuQ3VycmVudCB3b3JrZmxvdyBzdGF0ZTpcbi0gUGhhc2U6ICR7d29ya2Zsb3cuY3VycmVudFBoYXNlfVxuLSBDdXJyZW50IHZlcnNlOiAke3dvcmtmbG93LmN1cnJlbnRWZXJzZX1cbi0gQ3VycmVudCBwaHJhc2UgaW5kZXg6ICR7d29ya2Zsb3cuY3VycmVudFBocmFzZSB8fCAwfVxuLSBQaHJhc2VzIGNvbXBsZXRlZDogJHtPYmplY3Qua2V5cyh3b3JrZmxvdy52ZXJzZVByb2dyZXNzIHx8IHt9KS5sZW5ndGh9YDtcblxuICAgIC8vIEFkZCB2ZXJzZSBkYXRhIGlmIGluIFVuZGVyc3RhbmRpbmcgcGhhc2VcbiAgICBpZiAod29ya2Zsb3cuY3VycmVudFBoYXNlID09PSBcInVuZGVyc3RhbmRpbmdcIiAmJiB2ZXJzZURhdGEpIHtcbiAgICAgIHdvcmtmbG93Q29udGV4dCArPSBgXFxuXFxuVmVyc2UgYmVpbmcgdHJhbnNsYXRlZCAoJHt2ZXJzZURhdGEucmVmZXJlbmNlfSk6XG5GdWxsIHRleHQ6IFwiJHt2ZXJzZURhdGEudGV4dH1cIlxuUGhyYXNlczpcbiR7dmVyc2VEYXRhLnBocmFzZXM/Lm1hcCgocCwgaSkgPT4gYCR7aSArIDF9LiBcIiR7cH1cImApLmpvaW4oXCJcXG5cIil9XG5DdXJyZW50IHBocmFzZSAoJHt3b3JrZmxvdy5jdXJyZW50UGhyYXNlICsgMX0vJHt2ZXJzZURhdGEucGhyYXNlcz8ubGVuZ3RofSk6IFwiJHtcbiAgICAgICAgdmVyc2VEYXRhLnBocmFzZXM/Llt3b3JrZmxvdy5jdXJyZW50UGhyYXNlXVxuICAgICAgfVwiYDtcbiAgICB9XG5cbiAgICAvLyBBZGQgd29ya2Zsb3cgY29udGV4dCB0byB0aGUgc3lzdGVtIG1lc3NhZ2VcbiAgICBjb25zdCBjb250ZXh0dWFsaXplZE1lc3NhZ2VzID0gW1xuICAgICAge1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBgJHtTWVNURU1fUFJPTVBUfSR7d29ya2Zsb3dDb250ZXh0fVxcblxcblByb2plY3Qgc2V0dGluZ3M6ICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgcHJvamVjdD8uc3R5bGVHdWlkZSB8fCB7fVxuICAgICAgICApfWAsXG4gICAgICB9LFxuICAgICAgLi4ubWVzc2FnZXMsXG4gICAgXTtcblxuICAgIC8vIFN0cmVhbSByZXNwb25zZSBmcm9tIE9wZW5BSVxuICAgIGNvbnN0IGNvbXBsZXRpb24gPSBhd2FpdCBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IHByb2Nlc3MuZW52Lk9QRU5BSV9NT0RFTCB8fCBcImdwdC00by1taW5pXCIsXG4gICAgICBtZXNzYWdlczogY29udGV4dHVhbGl6ZWRNZXNzYWdlcyxcbiAgICAgIHN0cmVhbTogdHJ1ZSxcbiAgICAgIHRlbXBlcmF0dXJlOiAwLjcsXG4gICAgICBtYXhfdG9rZW5zOiAyMDAwLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIGEgc3RyZWFtaW5nIHJlc3BvbnNlXG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGNvbnN0IHN0cmVhbSA9IG5ldyBSZWFkYWJsZVN0cmVhbSh7XG4gICAgICBhc3luYyBzdGFydChjb250cm9sbGVyKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiBjb21wbGV0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gY2h1bmsuY2hvaWNlc1swXT8uZGVsdGE/LmNvbnRlbnQgfHwgXCJcIjtcbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShlbmNvZGVyLmVuY29kZShgZGF0YTogJHtKU09OLnN0cmluZ2lmeSh7IGNvbnRlbnQgfSl9XFxuXFxuYCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoZW5jb2Rlci5lbmNvZGUoXCJkYXRhOiBbRE9ORV1cXG5cXG5cIikpO1xuICAgICAgICAgIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb250cm9sbGVyLmVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2Uoc3RyZWFtLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIC4uLmhlYWRlcnMsXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9ldmVudC1zdHJlYW1cIixcbiAgICAgICAgXCJDYWNoZS1Db250cm9sXCI6IFwibm8tY2FjaGVcIixcbiAgICAgICAgQ29ubmVjdGlvbjogXCJrZWVwLWFsaXZlXCIsXG4gICAgICB9LFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJDaGF0IEFQSSBlcnJvcjpcIiwgZXJyb3IpO1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJGYWlsZWQgdG8gcHJvY2VzcyBjaGF0IHJlcXVlc3RcIiB9KSwge1xuICAgICAgc3RhdHVzOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7IC4uLmhlYWRlcnMsIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgfSk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFBQSxTQUFTLGNBQWM7QUFFdkIsSUFBTSxTQUFTLElBQUksT0FBTztBQUFBLEVBQ3hCLFFBQVEsUUFBUSxJQUFJO0FBQ3RCLENBQUM7QUFHRCxJQUFNLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQStDdEIsZUFBTyxRQUErQixLQUFLLFNBQVM7QUFFbEQsUUFBTSxVQUFVO0FBQUEsSUFDZCwrQkFBK0I7QUFBQSxJQUMvQixnQ0FBZ0M7QUFBQSxJQUNoQyxnQ0FBZ0M7QUFBQSxFQUNsQztBQUdBLE1BQUksSUFBSSxXQUFXLFdBQVc7QUFDNUIsV0FBTyxJQUFJLFNBQVMsTUFBTSxFQUFFLFFBQVEsQ0FBQztBQUFBLEVBQ3ZDO0FBRUEsTUFBSSxJQUFJLFdBQVcsUUFBUTtBQUN6QixXQUFPLElBQUksU0FBUyxzQkFBc0IsRUFBRSxRQUFRLEtBQUssUUFBUSxDQUFDO0FBQUEsRUFDcEU7QUFFQSxNQUFJO0FBQ0YsVUFBTSxFQUFFLFVBQVUsVUFBVSxTQUFTLFVBQVUsSUFBSSxNQUFNLElBQUksS0FBSztBQUdsRSxRQUFJLGtCQUFrQjtBQUFBO0FBQUE7QUFBQSxXQUNmLFNBQVMsWUFBWTtBQUFBLG1CQUNiLFNBQVMsWUFBWTtBQUFBLDBCQUNkLFNBQVMsaUJBQWlCLENBQUM7QUFBQSx1QkFDOUIsT0FBTyxLQUFLLFNBQVMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLE1BQU07QUFHbkUsUUFBSSxTQUFTLGlCQUFpQixtQkFBbUIsV0FBVztBQUMxRCx5QkFBbUI7QUFBQTtBQUFBLDBCQUErQixVQUFVLFNBQVM7QUFBQSxjQUM3RCxVQUFVLElBQUk7QUFBQTtBQUFBLEVBRTFCLFVBQVUsU0FBUyxJQUFJLENBQUMsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxJQUFJLENBQUM7QUFBQSxrQkFDL0MsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFJLFVBQVUsU0FBUyxNQUFNLE9BQ2pFLFVBQVUsVUFBVSxTQUFTLGFBQWEsQ0FDNUM7QUFBQSxJQUNGO0FBR0EsVUFBTSx5QkFBeUI7QUFBQSxNQUM3QjtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sU0FBUyxHQUFHLGFBQWEsR0FBRyxlQUFlO0FBQUE7QUFBQSxvQkFBeUIsS0FBSztBQUFBLFVBQ3ZFLFNBQVMsY0FBYyxDQUFDO0FBQUEsUUFDMUIsQ0FBQztBQUFBLE1BQ0g7QUFBQSxNQUNBLEdBQUc7QUFBQSxJQUNMO0FBR0EsVUFBTSxhQUFhLE1BQU0sT0FBTyxLQUFLLFlBQVksT0FBTztBQUFBLE1BQ3RELE9BQU8sUUFBUSxJQUFJLGdCQUFnQjtBQUFBLE1BQ25DLFVBQVU7QUFBQSxNQUNWLFFBQVE7QUFBQSxNQUNSLGFBQWE7QUFBQSxNQUNiLFlBQVk7QUFBQSxJQUNkLENBQUM7QUFHRCxVQUFNLFVBQVUsSUFBSSxZQUFZO0FBQ2hDLFVBQU0sU0FBUyxJQUFJLGVBQWU7QUFBQSxNQUNoQyxNQUFNLE1BQU0sWUFBWTtBQUN0QixZQUFJO0FBQ0YsMkJBQWlCLFNBQVMsWUFBWTtBQUNwQyxrQkFBTSxVQUFVLE1BQU0sUUFBUSxDQUFDLEdBQUcsT0FBTyxXQUFXO0FBQ3BELGdCQUFJLFNBQVM7QUFDWCx5QkFBVyxRQUFRLFFBQVEsT0FBTyxTQUFTLEtBQUssVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQUE7QUFBQSxDQUFNLENBQUM7QUFBQSxZQUMvRTtBQUFBLFVBQ0Y7QUFDQSxxQkFBVyxRQUFRLFFBQVEsT0FBTyxrQkFBa0IsQ0FBQztBQUNyRCxxQkFBVyxNQUFNO0FBQUEsUUFDbkIsU0FBUyxPQUFPO0FBQ2QscUJBQVcsTUFBTSxLQUFLO0FBQUEsUUFDeEI7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBRUQsV0FBTyxJQUFJLFNBQVMsUUFBUTtBQUFBLE1BQzFCLFNBQVM7QUFBQSxRQUNQLEdBQUc7QUFBQSxRQUNILGdCQUFnQjtBQUFBLFFBQ2hCLGlCQUFpQjtBQUFBLFFBQ2pCLFlBQVk7QUFBQSxNQUNkO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSCxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sbUJBQW1CLEtBQUs7QUFDdEMsV0FBTyxJQUFJLFNBQVMsS0FBSyxVQUFVLEVBQUUsT0FBTyxpQ0FBaUMsQ0FBQyxHQUFHO0FBQUEsTUFDL0UsUUFBUTtBQUFBLE1BQ1IsU0FBUyxFQUFFLEdBQUcsU0FBUyxnQkFBZ0IsbUJBQW1CO0FBQUEsSUFDNUQsQ0FBQztBQUFBLEVBQ0g7QUFDRjsiLAogICJuYW1lcyI6IFtdCn0K
