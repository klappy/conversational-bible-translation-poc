import { useState, useRef, useEffect } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { generateUniqueId } from "../utils/idGenerator";
import { getSessionHeaders } from "../utils/sessionManager";
import AgentMessage from "./AgentMessage";
import AgentStatus from "./AgentStatus";
import ShareSession from "./ShareSession";
import InlineSuggestions from "./InlineSuggestions";
import "./ChatInterface.css";

const ChatInterfaceMultiAgent = () => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
  }, [updateFromServerState]); // Include dependency

  // Separate effect for initial message generation
  useEffect(() => {
    if (
      !initialMessageGenerated.current &&
      messages.length === 0 &&
      generateInitialMessage &&
      canvasState
    ) {
      const initialMsg = generateInitialMessage(canvasState);
      // Add locally - will be synced to server on first user message
      // Or we can save it immediately (see below)
      addMessage(initialMsg);
      initialMessageGenerated.current = true;

      // Save initial greeting to server immediately
      const saveInitialGreeting = async () => {
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
        }
      };
      saveInitialGreeting();
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: input,
      id: generateUniqueId("user"),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput("");
    setIsLoading(true);

    // Force scroll when user sends a message
    scrollToBottom(true);

    // Set agents to thinking state
    setThinkingAgents(["orchestrator", "primary", "state"]);

    try {
      // Use new conversation endpoint with multi-agent support
      const apiUrl = import.meta.env.DEV
        ? "http://localhost:9999/.netlify/functions/conversation"
        : "/.netlify/functions/conversation";

      console.log("Calling conversation endpoint:", apiUrl);
      console.log("With message:", input);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSessionHeaders(),
        },
        body: JSON.stringify({
          message: input,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
            agent: m.agent,
          })),
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const result = await response.json();
      console.log("Got result:", result);
      console.log("🚨 CRITICAL CHECK - result.suggestions:", result.suggestions);
      console.log("🚨 CRITICAL CHECK - Is Array?:", Array.isArray(result.suggestions));
      console.log("🚨 CRITICAL CHECK - Length:", result.suggestions?.length);

      // Clear thinking agents
      setThinkingAgents([]);

      // Update active agents based on response
      if (result.agentResponses) {
        setActiveAgents(Object.keys(result.agentResponses));
      }

      // ALWAYS update canvas state (workflow, glossary, etc.)
      // Server is source of truth for ALL state, not just conversation
      if (result.canvasState) {
        console.log("✅ Updating canvas state from server");
        setCanvasState(result.canvasState);
        if (updateFromServerState) {
          updateFromServerState(result.canvasState);
        }
      }
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
        <h2>Bible Translation Assistant</h2>
        <div className='workflow-info'>
          <span className='workflow-phase'>{phaseDisplay}</span>
          <span className='workflow-verse'>{getCurrentVerse()}</span>
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
                  // Auto-fill input and send
                  setInput(suggestion);
                  // Optionally auto-send after a short delay
                  setTimeout(() => {
                    const form = document.querySelector(".chat-form");
                    if (form) form.requestSubmit();
                  }, 100);
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
