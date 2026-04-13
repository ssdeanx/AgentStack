---
title: "v0 clone"
source: "https://elements.ai-sdk.dev/examples/v0"
author:
published:
created: 2026-03-30
description: "An example of how to use the AI Elements to build a v0 clone."
tags:
  - "clippings"
---
An example of how to use the AI Elements to build a v0 clone.

Build me an agent skills website with a modern dark theme

I'll create a sleek agent skills website with a dark theme. The design will feature a clean layout showcasing various AI agent capabilities with smooth animations.

Add a hero section with a catchy tagline about AI skills

Done! I've added a hero section with the tagline 'Supercharge your AI agents with powerful skills'. The section includes a gradient background and animated elements.

Can you add a grid of skill cards showing different capabilities?

I've added a skills grid featuring cards for Web Search, Code Execution, File Management, API Integration, and more. Each card has an icon and description. Check the preview!

## Tutorial

Let's walk through how to build a v0 clone using AI Elements and the [v0 Platform API](https://v0.dev/docs/api/platform).

### Setup

First, set up a new Next.js repo and cd into it by running the following command (make sure you choose to use Tailwind the project setup):

```
npx create-next-app@latest v0-clone && cd v0-clone
```

Run the following command to install shadcn/ui and AI Elements.

```
npx shadcn@latest init && npx ai-elements@latest
```

Now, install the v0 sdk:

```
npm i v0-sdk
```

In order to use the providers, let's configure a v0 API key. Create a `.env.local` in your root directory and navigate to your [v0 account settings](https://v0.dev/chat/settings/keys) to create a token, then paste it in your `.env.local` as `V0_API_KEY`.

We're now ready to start building our app!

### Client

In your `app/page.tsx`, replace the code with the file below.

Here, we use `Conversation` to wrap the conversation code, and the `WebPreview` component to render the URL returned from the v0 API.

```
"use client";

import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import { Spinner } from "@/components/ui/spinner";
import { nanoid } from "nanoid";
import { memo, useCallback, useState } from "react";

interface Chat {
  id: string;
  demo: string;
}

const mockChatHistory = [
  {
    content: "Build me an agent skills website with a modern dark theme",
    id: "1",
    type: "user" as const,
  },
  {
    content:
      "I'll create a sleek agent skills website with a dark theme. The design will feature a clean layout showcasing various AI agent capabilities with smooth animations.",
    id: "2",
    type: "assistant" as const,
  },
  {
    content: "Add a hero section with a catchy tagline about AI skills",
    id: "3",
    type: "user" as const,
  },
  {
    content:
      "Done! I've added a hero section with the tagline 'Supercharge your AI agents with powerful skills'. The section includes a gradient background and animated elements.",
    id: "4",
    type: "assistant" as const,
  },
  {
    content:
      "Can you add a grid of skill cards showing different capabilities?",
    id: "5",
    type: "user" as const,
  },
  {
    content:
      "I've added a skills grid featuring cards for Web Search, Code Execution, File Management, API Integration, and more. Each card has an icon and description. Check the preview!",
    id: "6",
    type: "assistant" as const,
  },
];

const mockChat: Chat = {
  demo: "https://skills.sh/",
  id: "mock-chat-1",
};

interface SuggestionItemProps {
  text: string;
  onSuggestionClick: (text: string) => void;
}

const SuggestionItem = memo(
  ({ text, onSuggestionClick }: SuggestionItemProps) => {
    const handleClick = useCallback(
      () => onSuggestionClick(text),
      [onSuggestionClick, text]
    );
    return <Suggestion onClick={handleClick} suggestion={text} />;
  }
);

SuggestionItem.displayName = "SuggestionItem";

export default function Home() {
  const [message, setMessage] = useState("");
  const [currentChat, setCurrentChat] = useState<Chat | null>(mockChat);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    {
      id: string;
      type: "user" | "assistant";
      content: string;
    }[]
  >(mockChatHistory);

  const handleSendMessage = useCallback(
    async (promptMessage: PromptInputMessage) => {
      const hasText = Boolean(promptMessage.text);
      const hasAttachments = Boolean(promptMessage.files?.length);

      if (!(hasText || hasAttachments) || isLoading) {
        return;
      }

      const userMessage = promptMessage.text?.trim() || "Sent with attachments";
      setMessage("");
      setIsLoading(true);

      setChatHistory((prev) => [
        ...prev,
        { content: userMessage, id: nanoid(), type: "user" },
      ]);

      try {
        const response = await fetch("/api/v0", {
          body: JSON.stringify({
            chatId: currentChat?.id,
            message: userMessage,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to create chat");
        }

        const chat: Chat = await response.json();
        setCurrentChat(chat);

        setChatHistory((prev) => [
          ...prev,
          {
            content: "Generated new app preview. Check the preview panel!",
            id: nanoid(),
            type: "assistant",
          },
        ]);
      } catch (error) {
        console.error("Error:", error);
        setChatHistory((prev) => [
          ...prev,
          {
            content:
              "Sorry, there was an error creating your app. Please try again.",
            id: nanoid(),
            type: "assistant",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentChat?.id, isLoading]
  );

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setMessage(suggestion);
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value),
    []
  );

  return (
    <div className="flex size-full divide-x">
      {/* Chat Panel */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {chatHistory.length === 0 ? (
            <div className="mt-8 text-center font-semibold">
              <p className="mt-4 text-3xl">What can we build together?</p>
            </div>
          ) : (
            <>
              <Conversation>
                <ConversationContent>
                  {chatHistory.map((msg) => (
                    <Message from={msg.type} key={msg.id}>
                      <MessageContent>{msg.content}</MessageContent>
                    </Message>
                  ))}
                </ConversationContent>
              </Conversation>
              {isLoading && (
                <Message from="assistant">
                  <MessageContent>
                    <p className="flex items-center gap-2">
                      <Spinner />
                      Creating your app...
                    </p>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4">
          {!currentChat && (
            <Suggestions>
              <SuggestionItem
                onSuggestionClick={handleSuggestionClick}
                text="Create a responsive navbar with Tailwind CSS"
              />
              <SuggestionItem
                onSuggestionClick={handleSuggestionClick}
                text="Build a todo app with React"
              />
              <SuggestionItem
                onSuggestionClick={handleSuggestionClick}
                text="Make a landing page for a coffee shop"
              />
            </Suggestions>
          )}
          <div className="flex gap-2">
            <PromptInput
              className="relative mx-auto w-full max-w-2xl"
              onSubmit={handleSendMessage}
            >
              <PromptInputTextarea
                className="min-h-[60px] pr-12"
                onChange={handleTextChange}
                value={message}
              />
              <PromptInputSubmit
                className="absolute right-1 bottom-1"
                disabled={!message}
                status={isLoading ? "streaming" : "ready"}
              />
            </PromptInput>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex flex-1 flex-col">
        <WebPreview className="rounded-none border-0">
          <WebPreviewNavigation>
            <WebPreviewUrl
              placeholder="Your app here..."
              value={currentChat?.demo}
            />
          </WebPreviewNavigation>
          <WebPreviewBody src={currentChat?.demo} />
        </WebPreview>
      </div>
    </div>
  );
}
```

In this case, we'll also edit the base component `components/ai-elements/web-preview.tsx` in order to best match with our theme.

```
return (
    <WebPreviewContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex size-full flex-col bg-card', // remove rounded-lg border
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </WebPreviewContext.Provider>
  );
};

export type WebPreviewNavigationProps = ComponentProps<'div'>;

export const WebPreviewNavigation = ({
  className,
  children,
  ...props
}: WebPreviewNavigationProps) => (
  <div
    className={cn('flex items-center gap-1 border-b p-2 h-14', className)} // add h-14
    {...props}
  >
    {children}
  </div>
);
```

### Server

Create a new route handler `app/api/chat/route.ts` and paste in the following code. We use the v0 SDK to manage chats.

```
import { NextRequest, NextResponse } from "next/server";
import { v0 } from "v0-sdk";

export async function POST(request: NextRequest) {
  try {
    const { message, chatId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    let chat;

    if (chatId) {
      // continue existing chat
      chat = await v0.chats.sendMessage({
        chatId: chatId,
        message,
      });
    } else {
      // create new chat
      chat = await v0.chats.create({
        message,
      });
    }

    return NextResponse.json({
      id: chat.id,
      demo: chat.demo,
    });
  } catch (error) {
    console.error("V0 API Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
```

To start your server, run `pnpm dev`, navigate to `localhost:3000` and try building an app!

You now have a working v0 clone you can build off of! Feel free to explore the [v0 Platform API](https://v0.dev/docs/api/platform) and components like [`Reasoning`](https://elements.ai-sdk.dev/components/reasoning) and [`Task`](https://elements.ai-sdk.dev/components/task) to extend your app, or view the other examples.