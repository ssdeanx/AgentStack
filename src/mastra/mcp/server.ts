import { MCPServer } from "@mastra/mcp";
import { resourceHandlers } from "./resources";
import { writeNoteTool } from "../tools/write-note";
import { promptHandlers } from "./prompts";

export const notes = new MCPServer({
  name: "notes",
  version: "0.1.0",
  resources: resourceHandlers,
  prompts: promptHandlers,
  tools: {
    write: writeNoteTool,
  },
});
