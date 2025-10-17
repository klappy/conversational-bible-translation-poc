import { useState, useRef, useEffect } from "react";
import { useTranslation } from "../contexts/TranslationContext";
import AgentMessage from "./AgentMessage";
import AgentStatus from "./AgentStatus";
import "./ChatInterface.css";

const ChatInterfaceMultiAgent = () => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAudioRecord, setShowAudioRecord] = useState(false);
  const [activeAgents, setActiveAgents] = useState(['primary', 'state']);
  const [thinkingAgents, setThinkingAgents] = useState([]);
  const [canvasState, setCanvasState] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollingInterval = useRef(null);

  const { 
    messages, 
    addMessage,
    setMessages,
    generateInitialMessage,
    updateFromServerState
  } = useTranslation();

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
          
          // Generate initial message only once, when state is loaded and no messages exist
          if (!initialMessageGenerated.current && messages.length === 0 && generateInitialMessage) {
            const initialMsg = generateInitialMessage(state);
            addMessage(initialMsg);
            initialMessageGenerated.current = true;
          }
        }
      } catch (error) {
        // Silently fail - server might not be running yet
      }
    };

    // Initial poll
    pollCanvasState();
    
    // Set up polling interval (every 2 seconds)
    pollingInterval.current = setInterval(pollCanvasState, 2000);
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [updateFromServerState, messages.length, generateInitialMessage, addMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: input,
      id: Date.now(),
      timestamp: new Date()
    };

    addMessage(userMessage);
    setInput("");
    setIsLoading(true);
    
    // Set agents to thinking state
    setThinkingAgents(['orchestrator', 'primary', 'state']);

    try {
      // Use new conversation endpoint with multi-agent support
      const apiUrl = import.meta.env.DEV
        ? "http://localhost:9999/.netlify/functions/conversation"
        : "/.netlify/functions/conversation";

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
            agent: m.agent
          }))
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const result = await response.json();
      
      // Clear thinking agents
      setThinkingAgents([]);
      
      // Update active agents based on response
      if (result.agentResponses) {
        setActiveAgents(Object.keys(result.agentResponses));
      }
      
      // Add agent messages to conversation
      if (result.messages && result.messages.length > 0) {
        result.messages.forEach(msg => {
          addMessage({
            ...msg,
            id: Date.now() + Math.random(),
            timestamp: new Date()
          });
        });
      }
      
      // Update canvas state if provided
      if (result.canvasState) {
        setCanvasState(result.canvasState);
        if (updateFromServerState) {
          updateFromServerState(result.canvasState);
        }
      }
      
    } catch (error) {
      console.error("Chat error:", error);
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
              glossary: canvasState?.glossary || {}
            }
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
            agent: { id: 'primary', icon: '📖', color: '#3B82F6' }
          });
        } else {
          throw new Error("Fallback also failed");
        }
      } catch (fallbackError) {
        addMessage({
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          agent: { id: 'system', icon: '⚠️', color: '#EF4444' },
          id: Date.now(),
          timestamp: new Date()
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
    return canvasState?.workflow?.currentPhase || 'planning';
  };
  
  const getCurrentVerse = () => {
    return canvasState?.workflow?.currentVerse || 'Ruth 1:1';
  };

  return (
    <div className='chat-interface'>
      <div className='chat-header'>
        <h2>Bible Translation Assistant</h2>
        <span className='workflow-phase'>
          {getCurrentPhase()} | {getCurrentVerse()}
        </span>
      </div>
      
      {/* Agent Status Panel */}
      <AgentStatus 
        activeAgents={activeAgents}
        thinking={thinkingAgents}
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
