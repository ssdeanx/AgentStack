import { Tool, ToolContent, ToolHeader, ToolOutput } from "../src/components/ai-elements/tool";
import type { AgentDataPart } from "@mastra/ai-sdk";

export const AgentTool = ({ id, type, data }: AgentDataPart) => {
  return (
    <Tool>
      <ToolHeader
        id={`Agent Tool: ${id}`}
      />
      <ToolContent>
        <ToolOutput output={data} />
      </ToolContent>
    </Tool>
  );
};