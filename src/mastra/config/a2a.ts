// This is an example of how to use the a2a AI provider with Mastra to stream text responses.
// Make sure to replace 'https://your-a2a-server.example.com' with your actual a2a server URL.
// Also this has to be with mastra version that supports a2a provider.
// model: a2a('https://your-a2a-server.example.com')
// with providerOptions to set contextId for conversation history.
// Also we can use our own a2a agent to handle more complex interactions.
import { a2a } from 'a2a-ai-provider';
import { streamText } from 'ai';

const chatId = 'unique-chat-id'; // for each conversation to keep history in a2a server

const streamResult = streamText({
  model: a2a('https://your-a2a-server.example.com'),
  prompt: 'What is love?',
  providerOptions: {
    a2a: {
      contextId: chatId,
    },
  },
});

await streamResult.consumeStream();

console.log(await streamResult.content);