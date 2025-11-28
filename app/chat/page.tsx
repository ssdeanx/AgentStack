"use client";

import { useState, useRef, useCallback } from "react";
import { mastraClient } from "@/lib/mastra-client";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AVAILABLE_AGENTS = [
  { id: "weatherAgent", name: "Weather Agent" },
  { id: "researchAgent", name: "Research Agent" },
  { id: "copywriterAgent", name: "Copywriter" },
  { id: "editorAgent", name: "Editor" },
  { id: "reportAgent", name: "Report Agent" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("weatherAgent");
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage = input.trim();
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      setIsLoading(true);
      setStreamingContent("");

      try {
        const agent = mastraClient.getAgent(selectedAgent);

        const response = await agent.stream({
          messages: [{ role: "user", content: userMessage }],
        });

        let fullContent = "";

        response.processDataStream({
          onChunk: async (chunk) => {
            if (chunk.type === "text-delta") {
              const text = chunk.payload?.text || "";
              fullContent += text;
              setStreamingContent(fullContent);
            }
          },
        });

        await new Promise<void>((resolve) => {
          const checkComplete = setInterval(() => {
            if (!isLoading) {
              clearInterval(checkComplete);
              resolve();
            }
          }, 100);

          setTimeout(() => {
            clearInterval(checkComplete);
            resolve();
          }, 30000);
        });

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullContent || "No response received." },
        ]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${errorMessage}` },
        ]);
      } finally {
        setIsLoading(false);
        setStreamingContent("");
      }
    },
    [input, isLoading, selectedAgent]
  );

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-foreground">
              AgentStack
            </Link>
            <span className="text-muted-foreground">Client SDK Chat</span>
          </div>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            aria-label="Select an agent"
            title="Select an agent"
            className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground"
          >
            {AVAILABLE_AGENTS.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex-1 container mx-auto p-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Start a conversation</p>
              <p className="text-sm">
                Using <code className="bg-muted px-1 rounded">{selectedAgent}</code> via Mastra Client SDK
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {message.content}
                </pre>
              </div>
            </div>
          ))}

          {isLoading && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-card border border-border text-foreground">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {streamingContent}
                  <span className="animate-pulse">▊</span>
                </pre>
              </div>
            </div>
          )}

          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-lg px-4 py-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-border p-4">
        <form
          onSubmit={handleSubmit}
          className="container mx-auto max-w-3xl flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${selectedAgent}...`}
            disabled={isLoading}
            className="flex-1 bg-card border border-border rounded-md px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              className="bg-destructive text-white px-4 py-2 rounded-md font-medium hover:bg-destructive/90 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Send
            </button>
          )}
        </form>
      </footer>
    </main>
  );
}
