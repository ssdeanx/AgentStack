import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import type { AgentDataPart } from "@mastra/ai-sdk";

export function NestedAgentChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "http://localhost:4111/chat/weatherAgent",
    }),
  });

  return (
    <div>
      <form onSubmit={(e) => {
        e.preventDefault();
        sendMessage({ text: input });
        setInput("");
      }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter a city" />
        <button type="submit" disabled={status !== "ready"}>Get Forecast</button>
      </form>

      {messages.map((message) => (
        <div key={message.id}>
          {message.parts.map((part, index) => {
            if (part.type === "text") {
              return <p key={index}>{part.text}</p>;
            }
            if (part.type === "data-tool-agent") {
              const { id, data } = part as AgentDataPart;
              return (
                <div key={index} className="nested-agent">
                  <strong>Nested Agent: {id}</strong>
                  {data.text && <p>{data.text}</p>}
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
}