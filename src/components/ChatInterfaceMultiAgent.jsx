import { useState, useRef, useEffect } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { generateUniqueId } from "../utils/idGenerator";
import { getSessionHeaders, getSessionId } from "../utils/sessionManager";
import AgentMessage from "./AgentMessage";
import AgentStatus from "./AgentStatus";
import ShareSession from "./ShareSession";
import InlineSuggestions from "./InlineSuggestions";
import "./ChatInterface.css";

const ChatInterfaceMultiAgent = () => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [showAudioRecord, setShowAudioRecord] = useState(false);
  const [activeAgents, setActiveAgents] = useState(["primary", "state"]);
  const [thinkingAgents, setThinkingAgents] = useState([]);
  const [canvasState, setCanvasState] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const previousMessageCount = useRef(0);

  const { messages, addMessage, generateInitialMessage, updateFromServerState } = useTranslation();

  // Track if initial message has been generated
  const initialMessageGenerated = useRef(false);

  // Poll for canvas state updates
  useEffect(() => {
    const pollCanvasState = async () => {
      // Don't sync from server while we're sending a message
      // This prevents race conditions where local optimistic updates get overwritten
      if (isLoading) {
        console.log("Skipping poll - message in flight");
        return;
      }

      try {
        const apiUrl = import.meta.env.DEV
          ? "http://localhost:9999/.netlify/functions/canvas-state"
          : "/.netlify/functions/canvas-state";

        const response = await fetch(apiUrl, {
          headers: {
            ...getSessionHeaders(),
          },
        });
        if (response.ok) {
          const state = await response.json();
          setCanvasState(state);
          // Update local state from server state
          if (updateFromServerState) {
            updateFromServerState(state);
          }
        }
      } catch {
        // Silently fail - server might not be running yet
      }
    };

    // Initial poll
    pollCanvasState();

    // Set up polling interval (every 2 seconds)
    const intervalId = setInterval(pollCanvasState, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [updateFromServerState, isLoading]); // Add isLoading to dependencies

  // Separate effect for initial message generation
  useEffect(() => {
    const generateInitialGreetingIfNeeded = async () => {
      // Only generate if we haven't already, local messages are empty,
      // AND server conversation history is also empty
      if (
        !initialMessageGenerated.current &&
        messages.length === 0 &&
        generateInitialMessage &&
        canvasState &&
        (!canvasState.conversationHistory || canvasState.conversationHistory.length === 0)
      ) {
        const initialMsg = generateInitialMessage(canvasState);
        initialMessageGenerated.current = true;

        // Save initial greeting to server immediately
        // Don't add locally - let polling sync it back from server
        try {
          const apiUrl = import.meta.env.DEV
            ? "http://localhost:9999/.netlify/functions/canvas-state/update"
            : "/.netlify/functions/canvas-state/update";

          await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getSessionHeaders(),
            },
            body: JSON.stringify({
              updates: {
                conversationHistory: [
                  {
                    ...initialMsg,
                    timestamp: initialMsg.timestamp.toISOString(),
                  },
                ],
              },
            }),
          });
          console.log("✅ Initial greeting saved to server");
        } catch (error) {
          console.error("Failed to save initial greeting:", error);
          // Fallback: add locally if server save fails
          addMessage(initialMsg);
        }
      }
    };

    generateInitialGreetingIfNeeded();
  }, [messages.length, generateInitialMessage, addMessage, canvasState]);

  useEffect(() => {
    // Only scroll if we have new messages, not just because canvasState changed
    if (messages.length > previousMessageCount.current) {
      scrollToBottom();
      previousMessageCount.current = messages.length;
    }
  }, [messages, canvasState]);

  const scrollToBottom = (force = false) => {
    // Only auto-scroll if user is near the bottom or if forced
    const chatContainer = document.querySelector(".chat-messages");
    if (!chatContainer) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const isNearBottom =
      chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;

    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleRewind = async () => {
    if (isLoading || isRewinding) return;

    // Check if we have user messages to rewind
    const userMessageCount = messages.filter((m) => m.role === "user").length;
    if (userMessageCount === 0) return;

    setIsRewinding(true);

    try {
      const apiUrl = import.meta.env.DEV
        ? "http://localhost:9999/.netlify/functions/canvas-state/rewind"
        : "/.netlify/functions/canvas-state/rewind";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSessionHeaders(),
        },
      });

      if (response.ok) {
        // Force immediate refresh from server
        const canvasUrl = import.meta.env.DEV
          ? "http://localhost:9999/.netlify/functions/canvas-state"
          : "/.netlify/functions/canvas-state";

        const stateResponse = await fetch(canvasUrl, {
          headers: getSessionHeaders(),
        });

        if (stateResponse.ok) {
          const freshState = await stateResponse.json();
          updateFromServerState(freshState);
        }
      }
    } catch (error) {
      console.error("Failed to rewind conversation:", error);
    } finally {
      setIsRewinding(false);
    }
  };

  // Extracted message sending logic so both form submit and quick responses can use it
  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: messageText,
      id: generateUniqueId("user"),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput("");
    setIsLoading(true);

    // Save user message to canvas state immediately
    try {
      const canvasUrl = import.meta.env.DEV
        ? "http://localhost:9999/.netlify/functions/canvas-state"
        : "/.netlify/functions/canvas-state";

      const currentStateResponse = await fetch(canvasUrl, {
        headers: {
          ...getSessionHeaders(),
        },
      });

      let currentHistory = [];
      if (currentStateResponse.ok) {
        const currentState = await currentStateResponse.json();
        currentHistory = currentState.conversationHistory || [];
      }

      const apiUrl = import.meta.env.DEV
        ? "http://localhost:9999/.netlify/functions/canvas-state/update"
        : "/.netlify/functions/canvas-state/update";

      await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSessionHeaders(),
        },
        body: JSON.stringify({
          updates: {
            conversationHistory: [
              ...currentHistory,
              {
                ...userMessage,
                timestamp: userMessage.timestamp.toISOString(),
              },
            ],
          },
        }),
      });
    } catch (error) {
      console.error("Failed to save user message to canvas state:", error);
    }

    // Force scroll when user sends a message
    scrollToBottom(true);

    // Set initial thinking state
    setThinkingAgents(["orchestrator"]);

    try {
      // Step 1: Get orchestration sequence
      const orchestrateUrl = import.meta.env.DEV
        ? "http://localhost:9999/.netlify/functions/conversation-orchestrate"
        : "/.netlify/functions/conversation-orchestrate";

      console.log("🎭 Calling orchestrator to get sequence...");
      const orchestrateResponse = await fetch(orchestrateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSessionHeaders(),
        },
        body: JSON.stringify({
          message: messageText,
          sessionId: getSessionId(),
        }),
      });

      if (!orchestrateResponse.ok) {
        throw new Error(`Orchestration failed: ${orchestrateResponse.status}`);
      }

      const orchestration = await orchestrateResponse.json();
      console.log("📋 Agent sequence:", orchestration.sequence);

      // Step 2: Call agents sequentially
      const agentUrl = import.meta.env.DEV
        ? "http://localhost:9999/.netlify/functions/conversation-agent"
        : "/.netlify/functions/conversation-agent";

      const sessionIdValue = getSessionId();
      const previousResponses = [];
      let allSuggestions = [];

      for (const agentId of orchestration.sequence) {
        // Update thinking agents to show which one is currently working
        setThinkingAgents([agentId]);

        console.log(`📞 Calling agent: ${agentId}`);

        const agentResponse = await fetch(agentUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getSessionHeaders(),
          },
          body: JSON.stringify({
            message: messageText,
            agentId,
            sessionId: sessionIdValue,
            previousResponses,
          }),
        });

        if (!agentResponse.ok) {
          console.error(`Agent ${agentId} failed: ${agentResponse.status}`);
          continue; // Try next agent if this one fails
        }

        const agentResult = await agentResponse.json();
        console.log(`✅ Got response from ${agentId}:`, agentResult);

        // Add to previous responses so next agents know what was said
        previousResponses.push({
          agentId: agentResult.agentId,
          response: agentResult.response,
          agent: agentResult.agent,
        });

        // Display agent response immediately (except for suggestions)
        let responseText = agentResult.response ? agentResult.response.trim() : "";
        console.log(`Response text for ${agentId}: "${responseText}"`);

        // For primary agent, try to parse JSON and extract message
        if (agentId === "primary" && responseText) {
          try {
            const parsed = JSON.parse(responseText);
            if (parsed.message) {
              responseText = parsed.message;
              if (parsed.suggestions) {
                allSuggestions = parsed.suggestions;
              }
            }
          } catch {
            // Not JSON, use as-is
          }
        }

        if (responseText && agentId !== "suggestions") {
          console.log(`Adding message from ${agentId}`);
          const newMessage = {
            role: "assistant",
            content: responseText,
            agent: agentResult.agent,
            id: generateUniqueId(`msg-${agentId}`),
            timestamp: new Date(),
          };
          addMessage(newMessage);

          // Also save to canvas state immediately so polling doesn't overwrite
          try {
            // First get current conversation history
            const canvasUrl = import.meta.env.DEV
              ? "http://localhost:9999/.netlify/functions/canvas-state"
              : "/.netlify/functions/canvas-state";

            const currentStateResponse = await fetch(canvasUrl, {
              headers: {
                ...getSessionHeaders(),
              },
            });

            let currentHistory = [];
            if (currentStateResponse.ok) {
              const currentState = await currentStateResponse.json();
              currentHistory = currentState.conversationHistory || [];
            }

            // Now append the new message to existing history
            const apiUrl = import.meta.env.DEV
              ? "http://localhost:9999/.netlify/functions/canvas-state/update"
              : "/.netlify/functions/canvas-state/update";

            await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...getSessionHeaders(),
              },
              body: JSON.stringify({
                updates: {
                  conversationHistory: [
                    ...currentHistory,
                    {
                      ...newMessage,
                      timestamp: newMessage.timestamp.toISOString(),
                    },
                  ],
                },
              }),
            });
          } catch (error) {
            console.error("Failed to save message to canvas state:", error);
          }

          scrollToBottom(true);
        } else {
          console.log(
            `Skipping ${agentId}: empty=${!responseText}, isSuggestions=${
              agentId === "suggestions"
            }`
          );
        }

        // Collect suggestions if provided
        if (agentResult.suggestions && agentResult.suggestions.length > 0) {
          allSuggestions = agentResult.suggestions;
          console.log("💡 Got suggestions:", allSuggestions);
        }
      }

      // Step 3: Add suggestions if we have them
      if (allSuggestions.length > 0) {
        const suggestionsMessage = {
          type: "suggestions",
          role: "system",
          content: allSuggestions,
          id: generateUniqueId("suggestions"),
          timestamp: new Date(),
        };
        addMessage(suggestionsMessage);

        // Save suggestions to canvas state
        try {
          const canvasUrl = import.meta.env.DEV
            ? "http://localhost:9999/.netlify/functions/canvas-state"
            : "/.netlify/functions/canvas-state";

          const currentStateResponse = await fetch(canvasUrl, {
            headers: {
              ...getSessionHeaders(),
            },
          });

          let currentHistory = [];
          if (currentStateResponse.ok) {
            const currentState = await currentStateResponse.json();
            currentHistory = currentState.conversationHistory || [];
          }

          const apiUrl = import.meta.env.DEV
            ? "http://localhost:9999/.netlify/functions/canvas-state/update"
            : "/.netlify/functions/canvas-state/update";

          await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getSessionHeaders(),
            },
            body: JSON.stringify({
              updates: {
                conversationHistory: [
                  ...currentHistory,
                  {
                    ...suggestionsMessage,
                    timestamp: suggestionsMessage.timestamp.toISOString(),
                  },
                ],
              },
            }),
          });
        } catch (error) {
          console.error("Failed to save suggestions to canvas state:", error);
        }
      }

      // Step 4: Update canvas state from polling (will sync within 2 seconds)
      setThinkingAgents([]);
      setActiveAgents(orchestration.sequence);
    } catch (error) {
      console.error("Chat error - full details:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      setThinkingAgents([]);

      // Show error to user
      addMessage({
        role: "assistant",
        content:
          "I apologize, but I encountered an error processing your message. Please try again.",
        agent: { id: "system", icon: "⚠️", color: "#EF4444" },
        id: generateUniqueId("error"),
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setThinkingAgents([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleAudioRecord = () => {
    setShowAudioRecord(!showAudioRecord);
    // Mock audio recording for PoC
    if (showAudioRecord) {
      const transcript = prompt("Paste your audio transcript here:");
      if (transcript) {
        setInput(transcript);
        inputRef.current?.focus();
      }
    }
  };

  const getCurrentVerse = () => {
    return canvasState?.workflow?.currentVerse || "Ruth 1:1";
  };

  // Define phase display names
  const phaseNames = {
    planning: "📝 Plan",
    understanding: "🧠 Understand",
    drafting: "✍️ Draft",
    checking: "✅ Check",
    sharing: "💬 Share",
    publishing: "📤 Publish",
  };

  const currentPhase = canvasState?.workflow?.currentPhase || "planning";
  const phaseDisplay = phaseNames[currentPhase] || currentPhase;

  return (
    <div className='chat-interface'>
      <div className='chat-header'>
        <h2>Conversational Bible Translation</h2>
        <div className='workflow-info'>
          <span className='workflow-phase'>{phaseDisplay}</span>
          <span className='workflow-verse'>{getCurrentVerse()}</span>
          <button
            className='rewind-button'
            onClick={handleRewind}
            disabled={
              isLoading || isRewinding || messages.filter((m) => m.role === "user").length === 0
            }
            title='Undo last message'
          >
            ↶ Undo
          </button>
          <button
            className='share-button'
            onClick={() => setShowShareModal(true)}
            title='Share session or continue on another device'
          >
            📤 Share
          </button>
        </div>
      </div>

      {/* Agent Status Panel - Compact by default */}
      <AgentStatus
        activeAgents={activeAgents}
        thinking={thinkingAgents}
        defaultViewMode='compact'
      />

      <div className='messages-container'>
        {messages.map((message) => {
          // Handle inline suggestions
          if (message.type === "suggestions" && message.role === "system") {
            return (
              <InlineSuggestions
                key={message.id}
                messageId={message.id}
                suggestions={message.content}
                onSelect={(suggestion) => {
                  // Send the message directly when clicked
                  sendMessage(suggestion);
                }}
              />
            );
          }

          // Regular message
          return (
            <AgentMessage
              key={message.id}
              message={message}
              agent={message.agent}
              timestamp={message.timestamp}
            />
          );
        })}

        {isLoading && (
          <div className='thinking-indicator'>
            <div className='loading-dots'>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className='thinking-text'>Agents are collaborating...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className='input-form'>
        <div className='input-container'>
          <button
            type='button'
            className={`audio-button ${showAudioRecord ? "recording" : ""}`}
            onClick={handleAudioRecord}
            title='Record audio (mock)'
          >
            🎤
          </button>
          <input
            ref={inputRef}
            type='text'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Type your message or question...'
            disabled={isLoading}
            className='chat-input'
          />
          <button type='submit' disabled={!input.trim() || isLoading} className='send-button'>
            Send
          </button>
        </div>
        {showAudioRecord && (
          <div className='audio-record-hint'>
            Click the mic again and paste your transcript when prompted
          </div>
        )}
      </form>

      <ShareSession isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </div>
  );
};

export default ChatInterfaceMultiAgent;
