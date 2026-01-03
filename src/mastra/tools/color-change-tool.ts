import { createTool } from "@mastra/core/tools";
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
  execute: async ({ color }, context) => {
    await context?.writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "in-progress",
        message: `🎨 Changing background color to ${color}`,
        stage: "changeColor",
      },
      id: "changeColor",
    });

    // On the server, we just return the color.
    // The client-side UI will handle the actual style change when it receives the tool result or call.
    
    await context?.writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "done",
        message: `✅ Background color changed to ${color}`,
        stage: "changeColor",
      },
      id: "changeColor",
    });

    return { success: true, color };
  },
});
