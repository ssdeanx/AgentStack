import { InferUITool, createTool } from "@mastra/core/tools";
import { AISpanType } from "@mastra/core/ai-tracing";
import { z } from "zod";
import * as path from "node:path";
import * as fs from "fs/promises";
import type { TracingContext } from '@mastra/core/ai-tracing';

const NOTES_DIR = path.join(process.cwd(), "notes");

export const writeNoteTool = createTool({
  id: "write",
  description: "Write a new note or overwrite an existing one.",
  inputSchema: z.object({
    title: z
      .string()
      .nonempty()
      .describe("The title of the note. This will be the filename."),
    content: z
      .string()
      .nonempty()
      .describe("The markdown content of the note."),
  }),
  outputSchema: z.string().nonempty(),
  execute: async ({ context, tracingContext }: { context: { title: string; content: string }, tracingContext?: TracingContext }) => {
    const startTime = Date.now();
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: "write-note",
      input: { title: context.title, contentLength: context.content.length },
      metadata: { notesDir: NOTES_DIR },
    });

    try {
      const { title, content } = context;
      const filePath = path.join(NOTES_DIR, `${title}.md`);
      await fs.mkdir(NOTES_DIR, { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
      
      const result = `Successfully wrote to note \"${title}\".`;
      span?.end({
        output: { success: true, filePath, processingTimeMs: Date.now() - startTime },
      });
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        metadata: { processingTimeMs: Date.now() - startTime },
      });
      return `Error writing note: ${errorMessage}`;
    }
  },
});

export type WriteNoteUITool = InferUITool<typeof writeNoteTool>;