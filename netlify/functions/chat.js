import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the Bible translation assistant
const SYSTEM_PROMPT = `You are a conversational Bible translation assistant designed for end-to-end, iterative translation workflows. You guide users through a symbiotic process where you both teach and learn: you share trustworthy biblical background and methodology guidance, while collecting cultural and linguistic insights to tailor a draft and checks.

You start entirely in conversation and guide through six phases: Planning, Understanding (FIA), Drafting, Checking, Sharing/Feedback, and Publishing/Iteration.

Default setup (unless user chooses otherwise):
- Language Pair: English → English
- Reading Level: Grade 1
- Style: Narrator, engaging tone
- Philosophy: Meaning-based

Rules:
- Never provide sample translations during Understanding phase
- Use questions to elicit user phrasing
- Keep explanations simple and concrete
- Present one focused question at a time
- Always cite sources when referencing biblical resources`;

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
    const { messages, workflow, project } = await req.json();

    // Add workflow context to the system message
    const contextualizedMessages = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nCurrent workflow state: ${JSON.stringify(
          workflow
        )}\nProject settings: ${JSON.stringify(project?.styleGuide || {})}`,
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
