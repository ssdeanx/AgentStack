import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const confirmationTool = createTool({
  id: "confirmation-tool",
  description: "Requests user confirmation before proceeding",
  inputSchema: z.object({
    action: z.string()
  }),
  outputSchema: z.object({
    confirmed: z.boolean(),
    action: z.string()
  }),
  suspendSchema: z.object({
    message: z.string(),
    action: z.string()
  }),
  resumeSchema: z.object({
    confirmed: z.boolean()
  }),
  execute: async ({ action }, context) => {
    const { resumeData, suspend } = context?.agent ?? {};

    // Explicitly check for true to avoid nullable boolean in condition
    if (resumeData?.confirmed !== true) {
      return suspend?.({
        message: `Please confirm: ${action}`,
        action
      });
    }

    return { confirmed: true, action };
  }
});

export { confirmationTool };
