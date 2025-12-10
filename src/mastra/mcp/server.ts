import { MCPServer } from "@mastra/mcp";
import { writeNoteTool } from "../tools/write-note";
import { promptHandlers } from "./prompts";
import { resourceHandlers } from "./resources";

export const notesMCP = new MCPServer({
  id: "mcp:notes",
  name: "notes",
  version: "0.1.2",
  resources: resourceHandlers,
  prompts: promptHandlers,
  tools: {
    write: writeNoteTool,
  },
});
