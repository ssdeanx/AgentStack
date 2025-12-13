import { createTool } from "@mastra/client-js";
import z from "zod";

export function changeBgColor(color: string) {
  if (typeof window !== "undefined") {
    document.body.style.setProperty("--background", color);
  }
}

export const colorChangeTool = createTool({
  id: "changeColor",
  description: "Changes the background color",
  inputSchema: z.object({
    color: z.string(),
  }),
});
