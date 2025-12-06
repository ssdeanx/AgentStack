import { mastra } from "@/src/mastra";
import { createAgentStreamResponse } from "@/lib/client-stream-to-ai-sdk";
import type { UIMessage } from "ai";

export const maxDuration = 60;

interface ChatRequestBody {
  messages: UIMessage[];
  agentId?: string;
  threadId?: string;
  resourceId?: string;
  // legacy: some frontends (network-style) send options nested under `data`.
  // Accept either top-level fields or nested `data` so the chat route is
  // compatible with both chat-style and network-style clients.
  data?: {
    agentId?: string;
    threadId?: string;
    input?: string;
    memory?: unknown;
    resourceId?: string;
  };

  // memory shape can vary across versions — treat as unknown and pass through
  // to the Mastra API rather than tightly typing here to avoid fragile builds.
  memory?: unknown;
  maxSteps?: number;
}

export async function POST(req: Request) {
  const body: ChatRequestBody = await req.json();

  // Get available agents dynamically from mastra
  const agentsMap = await mastra.getAgents();
  const availableAgents = Object.keys(agentsMap);

  // Prefer explicit top-level agentId, then nested data.agentId (network-style),
  // otherwise fall back to the first available agent
  const agentId = (body.agentId ?? body.data?.agentId) ?? availableAgents[0];

  if (!agentId || !availableAgents.includes(agentId)) {
    return Response.json(
      { error: `Invalid or missing agentId. Available: ${availableAgents.join(", ")}` },
      { status: 400 }
    );
  }

  if (!body.messages?.length) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  try {
    // Support both top-level and nested data fields for older/newer client shapes
    const threadId = body.threadId ?? body.data?.threadId
    const resourceId = body.resourceId ?? body.data?.resourceId
    const memory = body.memory ?? body.data?.memory

    return await createAgentStreamResponse(mastra as Parameters<typeof createAgentStreamResponse>[0], agentId, body.messages, {
      threadId,
      resourceId,
      memory: memory as any,
      maxSteps: body.maxSteps ?? 50,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Stream failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const agentsMap = await mastra.getAgents();
  const availableAgents = Object.keys(agentsMap);
  return Response.json({ agents: availableAgents, count: availableAgents.length });
}