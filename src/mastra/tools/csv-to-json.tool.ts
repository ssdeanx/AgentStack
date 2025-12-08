import { AISpanType, InternalSpans } from "@mastra/core/ai-tracing";
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { parse } from "csv-parse/sync";
import * as fs from "node:fs/promises";
import { z } from "zod";

const csvToolContextSchema = z.object({
  maxRows: z.number().optional(),
});

export const csvToJsonTool = createTool({
  id: "csv-to-json",
  description: "Convert CSV data to JSON format. Accepts either a raw CSV string or a file path.",
  inputSchema: z.object({
    csvData: z.string().optional().describe("Raw CSV string data"),
    filePath: z.string().optional().describe("Absolute path to a CSV file"),
    options: z
      .object({
        delimiter: z.string().default(",").describe("CSV delimiter character"),
        columns: z.boolean().default(true).describe("Treat first row as headers"),
        trim: z.boolean().default(true).describe("Trim whitespace from values"),
        skip_empty_lines: z.boolean().default(true).describe("Skip empty lines"),
      })
      .optional()
      .default({
        delimiter: ",",
        columns: true,
        trim: true,
        skip_empty_lines: true,
      }),
  }),
  outputSchema: z.object({
    data: z.array(z.any()).describe("Parsed JSON data"),
    error: z.string().optional(),
  }),
  execute: async ({ context, writer, runtimeContext, tracingContext }) => {
    await writer?.write({ type: 'progress', data: { message: '📊 Starting CSV to JSON conversion' } });
    const rootSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: "csv-to-json",
      input: context,
      runtimeContext,
      tracingPolicy: { internal: InternalSpans.TOOL }
    });

    try {
      const config = runtimeContext?.get("csvToolContext");
      const { maxRows } = config !== undefined ? csvToolContextSchema.parse(config) : { maxRows: undefined };

      let contentToParse = context.csvData;

      if (context.filePath !== undefined && context.filePath !== null) {
        try {
          contentToParse = await fs.readFile(context.filePath, "utf-8");
        } catch (err) {
          throw new Error(`Failed to read file at ${context.filePath}: ${(err as Error).message}`);
        }
      }

      if (contentToParse === undefined || contentToParse === null || contentToParse === "") {
        throw new Error("Either csvData or filePath must be provided");
      }

      const options = context.options ?? {
        delimiter: ",",
        columns: true,
        trim: true,
        skip_empty_lines: true,
      };

      const records = parse(contentToParse, {
        delimiter: options.delimiter,
        columns: options.columns,
        trim: options.trim,
        skip_empty_lines: options.skip_empty_lines,
      });

      if (maxRows !== undefined && records.length > maxRows) {
        throw new Error(`Record count (${records.length}) exceeds maximum allowed (${maxRows})`);
      }

      await writer?.write({ type: 'progress', data: { message: `✅ Converted ${records.length} records` } });
      rootSpan?.end({ output: { recordCount: records.length } });
      return { data: records };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error parsing CSV";
      rootSpan?.error({ error: error instanceof Error ? error : new Error(errorMessage) });
      return { data: [], error: errorMessage };
    }
  },
});

export type CsvToJsonUITool = InferUITool<typeof csvToJsonTool>;
