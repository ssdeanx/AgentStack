import { mastra } from "@/src/mastra";
import { createAgentStreamResponse } from "@/lib/client-stream-to-ai-sdk";
import type { UIMessage } from "ai";

export const maxDuration = 60;

interface ChatRequestBody {
  messages: UIMessage[];
  agentId?: string;
  threadId?: string;
  resourceId?: string;
  memory?: {
    thread?: string | { id: string; resourceId?: string };
    resource?: string;
    options?: {
      lastMessages?: number;
      semanticRecall?: boolean;
      workingMemory?: { enabled?: boolean };
    };
  };
  maxSteps?: number;
}

export async function POST(req: Request) {
  const body: ChatRequestBody = await req.json();
  
  // Get available agents dynamically from mastra
  const agentsMap = await mastra.getAgents();
  const availableAgents = Object.keys(agentsMap);
  
  // Use first available agent if none specified
  const agentId = body.agentId || availableAgents[0];
  
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
    return await createAgentStreamResponse(mastra as Parameters<typeof createAgentStreamResponse>[0], agentId, body.messages, {
      threadId: body.threadId,
      resourceId: body.resourceId,
      memory: body.memory,
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
