import { Composio } from "@composio/core";
import { MastraProvider } from "@composio/mastra";
import { Agent } from "@mastra/core/agent";
import { LibsqlMemory } from "../config/libsql";
import { InternalSpans } from "@mastra/core/observability";
import { agentBrowser } from "../browsers";
import { mainWorkspace } from "../workspaces";

const composio = new Composio({
  provider: new MastraProvider(),
  apiKey: process.env.COMPOSIO_API_KEY,
});
// Create a session for your user
const userId = process.env.COMPOSIO_USER_ID || 'agenstack-admin';

const session = await composio.create(userId, {
  manageConnections: true,
});

const comptools = await session.tools();

export const composioAgent = new Agent({
  id: "composio-agent",
  name: "Composio Agent",
  instructions: "You are a helpful assistant that can use tools to perform tasks for the user. Use the tools provided to you to complete the user's requests. Always use the tools when appropriate. If you don't know how to do something, use the tools to find out. Be concise and efficient in your responses.",
  model: 'opencode/minimax-m2.5-free',
  memory: LibsqlMemory,
  tools: comptools,
  browser: agentBrowser,
  workspace: mainWorkspace,
  maxRetries: 5,
    options: {
      tracingPolicy: {
        internal: InternalSpans.AGENT,
      },
    },
});

//const { text } = await composioAgent.generate([
//  { role: "user", content: "Send an email to john@example.com with the subject 'Hello' and body 'Hello from Composio!'" },
//]);

//console.log(text);