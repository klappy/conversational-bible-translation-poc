import { useState, useRef, useEffect } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import { createResponseProcessor } from "../services/ResponseProcessor";
import AgentMessage from "./AgentMessage";
import AgentStatus from "./AgentStatus";
import "./ChatInterface.css";

const ChatInterfaceMultiAgent = () => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAudioRecord, setShowAudioRecord] = useState(false);
  const [activeAgents, setActiveAgents] = useState(["primary", "state"]);
  const [thinkingAgents, setThinkingAgents] = useState([]);
  const [canvasState, setCanvasState] = useState(null);
  const [responseOptions, setResponseOptions] = useState(null); // For multiple choice options
  const [responseSuggestions, setResponseSuggestions] = useState([]); // For AI suggestions
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const responseProcessorRef = useRef(null);

  const { messages, addMessage, setMessages, generateInitialMessage, updateFromServerState } =
    useTranslation();

  // Track if initial message has been generated
  const initialMessageGenerated = useRef(false);

  // Poll for canvas state updates
  useEffect(() => {
    const pollCanvasState = async () => {
      try {
        const apiUrl = import.meta.env.DEV
          ? "http://localhost:9999/.netlify/functions/canvas-state"
          : "/.netlify/functions/canvas-state";

        const response = await fetch(apiUrl);
        if (response.ok) {
          const state = await response.json();
          setCanvasState(state);
          // Update local state from server state
          if (updateFromServerState) {
            updateFromServerState(state);
          }
        }
      } catch (error) {
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
  }, []); // Empty dependency array - only set up once

  // Separate effect for initial message generation
  useEffect(() => {
    if (!initialMessageGenerated.current && messages.length === 0 && generateInitialMessage && canvasState) {
      const initialMsg = generateInitialMessage(canvasState);
      addMessage(initialMsg);
      initialMessageGenerated.current = true;
    }
  }, [messages.length, generateInitialMessage, addMessage, canvasState]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize response processor (we don't need all the context methods for just detection)
  useEffect(() => {
    responseProcessorRef.current = createResponseProcessor({});
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Generate quick suggestions based on workflow phase
  const generateQuickSuggestions = (workflow) => {
    const phase = workflow?.currentPhase || 'planning';
    
    switch (phase) {
      case 'planning':
        return [
          { text: "Use the default settings and begin", value: "1" },
          { text: "I'd like to customize the settings", value: "Let me adjust the settings - I want Grade 3 reading level" }
        ];
      case 'understanding':
        return [
          { text: "I understand it as...", value: "I understand this phrase to mean..." },
          { text: "In our context, we'd say...", value: "In our culture, this would be expressed as..." }
        ];
      case 'drafting':
        return [
          { text: "This draft looks good", value: "I like this draft, let's continue" },
          { text: "I'd like to revise it", value: "Let me adjust the wording..." }
        ];
      default:
        return [
          { text: "Continue", value: "Yes, let's continue" },
          { text: "Tell me more", value: "Can you explain that further?" }
        ];
    }
  };

  const handleOptionClick = (value) => {
    // Set the input value and submit
    setInput(value);
    // Clear options immediately
    setResponseOptions(null);
    setResponseSuggestions([]);
    // Auto-submit after a brief delay for user to see the filled input
    setTimeout(() => {
      if (inputRef.current) {
        const form = inputRef.current.closest('form');
        if (form) {
          form.requestSubmit();
        }
      }
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: input,
      id: Date.now(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput("");
    setIsLoading(true);
    
    // Clear response options when user submits
    setResponseOptions(null);
    setResponseSuggestions([]);

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

      // Clear thinking agents
      setThinkingAgents([]);

      // Update active agents based on response
      if (result.agentResponses) {
        setActiveAgents(Object.keys(result.agentResponses));
      }

      // Add agent messages to conversation
      if (result.messages && result.messages.length > 0) {
        result.messages.forEach((msg) => {
          addMessage({
            ...msg,
            id: Date.now() + Math.random(),
            timestamp: new Date(),
          });
        });
        
        // Check the last message for question types and extract options
        const lastMessage = result.messages[result.messages.length - 1];
        if (lastMessage && responseProcessorRef.current) {
          const multipleChoiceOptions = responseProcessorRef.current.extractMultipleChoiceOptions(lastMessage.content);
          if (multipleChoiceOptions) {
            setResponseOptions(multipleChoiceOptions);
            setResponseSuggestions([]); // Clear suggestions if we have multiple choice
          } else if (responseProcessorRef.current.isOpenEndedQuestion(lastMessage.content)) {
            // Generate simple suggestions based on workflow phase
            const suggestions = generateQuickSuggestions(canvasState?.workflow);
            setResponseSuggestions(suggestions);
            setResponseOptions(null);
          } else {
            // No question detected, clear both
            setResponseOptions(null);
            setResponseSuggestions([]);
          }
        }
      }

      // Update canvas state if provided
      if (result.canvasState) {
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

      // Fall back to old chat endpoint if multi-agent fails
      try {
        const fallbackUrl = import.meta.env.DEV
          ? "http://localhost:9999/.netlify/functions/chat"
          : "/.netlify/functions/chat";

        const fallbackResponse = await fetch(fallbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            workflow: canvasState?.workflow || {},
            project: {
              styleGuide: canvasState?.styleGuide || {},
              glossary: canvasState?.glossary || {},
            },
          }),
        });

        if (fallbackResponse.ok) {
          // Handle streaming response
          const reader = fallbackResponse.body.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    assistantMessage += parsed.content;
                  }
                  // Handle response suggestions from backend
                  if (parsed.suggestions) {
                    setResponseSuggestions(parsed.suggestions);
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          addMessage({
            role: "assistant",
            content: assistantMessage,
            id: Date.now(),
            timestamp: new Date(),
            agent: { id: "primary", icon: "📖", color: "#3B82F6" },
          });
          
          // Extract options from fallback assistant message
          if (responseProcessorRef.current) {
            const multipleChoiceOptions = responseProcessorRef.current.extractMultipleChoiceOptions(assistantMessage);
            if (multipleChoiceOptions) {
              setResponseOptions(multipleChoiceOptions);
              setResponseSuggestions([]); // Clear suggestions if we have multiple choice
            } else if (!responseSuggestions.length && responseProcessorRef.current.isOpenEndedQuestion(assistantMessage)) {
              // Generate suggestions if we don't have them from backend
              const suggestions = generateQuickSuggestions(canvasState?.workflow);
              setResponseSuggestions(suggestions);
              setResponseOptions(null);
            }
          }
        } else {
          throw new Error("Fallback also failed");
        }
      } catch (fallbackError) {
        addMessage({
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          agent: { id: "system", icon: "⚠️", color: "#EF4444" },
          id: Date.now(),
          timestamp: new Date(),
        });
      }
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

  // Get current workflow phase for display
  const getCurrentPhase = () => {
    return canvasState?.workflow?.currentPhase || "planning";
  };

  const getCurrentVerse = () => {
    return canvasState?.workflow?.currentVerse || "Ruth 1:1";
  };

  return (
    <div className='chat-interface'>
      <div className='chat-header'>
        <h2>Bible Translation Assistant</h2>
        <span className='workflow-phase'>
          {getCurrentVerse()}
        </span>
      </div>

      {/* Agent Status Panel - Compact by default */}
      <AgentStatus 
        activeAgents={activeAgents} 
        thinking={thinkingAgents} 
        defaultViewMode="compact"
      />

      <div className='messages-container'>
        {messages.map((message) => (
          <AgentMessage
            key={message.id}
            message={message}
            agent={message.agent}
            timestamp={message.timestamp}
          />
        ))}

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

      {/* Response Options - Multiple Choice or Suggestions */}
      {(responseOptions || responseSuggestions.length > 0) && (
        <div className='response-options-container'>
          {responseOptions && responseOptions.type === 'multiple-choice' && (
            <div className='multiple-choice-options'>
              <div className='options-label'>Choose your response:</div>
              <div className='options-buttons'>
                {responseOptions.options.map((option) => (
                  <button
                    key={option.letter}
                    type='button'
                    className='option-button'
                    onClick={() => handleOptionClick(option.letter)}
                    disabled={isLoading}
                  >
                    <span className='option-letter'>{option.letter})</span>
                    <span className='option-text'>{option.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {!responseOptions && responseSuggestions.length > 0 && (
            <div className='response-suggestions'>
              <div className='options-label'>Quick responses:</div>
              <div className='suggestion-cards'>
                {responseSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type='button'
                    className='suggestion-card'
                    onClick={() => handleOptionClick(suggestion.value)}
                    disabled={isLoading}
                  >
                    <div className='suggestion-text'>{suggestion.text}</div>
                    <div className='suggestion-hint'>Click to use this response</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
    </div>
  );
};

export default ChatInterfaceMultiAgent;
