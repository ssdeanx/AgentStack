import { Tool, ToolContent, ToolHeader, ToolOutput } from "../src/components/ai-elements/tool";
import type { AgentDataPart } from "@mastra/ai-sdk";

export const AgentTool = ({ id, type, data }: AgentDataPart) => {
  return (
    <Tool>
      <ToolHeader
        title={`Agent Tool: ${id}`}
        type={type.replace('data-', '') as `tool-${string}`}
        state="output-available"
      />
      <ToolContent>
        <ToolOutput output={data.text} errorText={undefined} />
      </ToolContent>
    </Tool>
  );
};
