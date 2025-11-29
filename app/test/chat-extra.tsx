"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { DefaultChatTransport } from 'ai';

export function ChatExtra() {
  const [inputValue, setInputValue] = useState('')
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: 'http://localhost:4111/chat',
    }),
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: inputValue }, {
      body: {
        data: {
          userId: "user123",
          preferences: {
            language: "en",
            temperature: "celsius"
          }
        }
      }
    });
  };

  return (
    <div>
      <pre>{JSON.stringify(messages, null, 2)}</pre>
      <form onSubmit={handleFormSubmit}>
        <input value={inputValue} onChange={e=>setInputValue(e.target.value)} placeholder="Name of city" />
      </form>
    </div>
  );
}