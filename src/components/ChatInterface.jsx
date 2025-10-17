import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "../contexts/TranslationContext";
import "./ChatInterface.css";

const ChatInterface = () => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAudioRecord, setShowAudioRecord] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { messages, addMessage, workflow, project } = useTranslation();

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
    };

    addMessage(userMessage);
    setInput("");
    setIsLoading(true);

    try {
      // Load verse data if in understanding phase
      let verseData = null;
      if (workflow.currentPhase === "understanding") {
        try {
          const response = await fetch("/data/ruth/bsb-ruth-1.json");
          const data = await response.json();

          // Parse current verse reference (e.g., "Ruth 1:1")
          const verseNum = parseInt(workflow.currentVerse.split(":")[1]);
          const verse = data.verses.find((v) => v.verse === verseNum);

          if (verse) {
            verseData = {
              reference: workflow.currentVerse,
              text: verse.text,
              phrases: verse.phrases,
            };
          }
        } catch (error) {
          console.error("Failed to load verse data:", error);
        }
      }

      // Use different URL for development vs production
      const apiUrl = import.meta.env.DEV
        ? "http://localhost:9999/.netlify/functions/chat"
        : "/.netlify/functions/chat";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          workflow,
          project,
          verseData,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      // Handle streaming response
      const reader = response.body.getReader();
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
                // Update the message in real-time (you could optimize this)
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
      });
    } catch (error) {
      console.error("Chat error:", error);
      addMessage({
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
      });
    } finally {
      setIsLoading(false);
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

  const formatMessage = (message) => {
    // Check for embedded resources
    const hasImage = message.content.includes("[IMAGE:");
    const hasMap = message.content.includes("[MAP:");

    let formattedContent = message.content;

    // Replace resource placeholders with actual elements
    formattedContent = formattedContent.replace(
      /\[IMAGE:([^\]]+)\]/g,
      (match, resourceId) => `![${resourceId}](/data/ruth/fia/${resourceId})`
    );

    formattedContent = formattedContent.replace(
      /\[MAP:([^\]]+)\]/g,
      (match, resourceId) => `![Map: ${resourceId}](/data/ruth/fia/${resourceId})`
    );

    return formattedContent;
  };

  return (
    <div className='chat-interface'>
      <div className='chat-header'>
        <h2>Bible Translation Assistant</h2>
        <span className='workflow-phase'>
          {workflow.currentPhase} | {workflow.currentVerse}
        </span>
      </div>

      <div className='messages-container'>
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className='message-header'>
              <span className='role'>{message.role === "user" ? "You" : "Assistant"}</span>
              <span className='timestamp'>{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className='message-content'>
              {message.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{formatMessage(message)}</ReactMarkdown>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className='message assistant'>
            <div className='message-content'>
              <div className='loading-dots'>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
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

export default ChatInterface;
